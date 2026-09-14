# المرجع الإلزامي لمشروع ميزان

هذا الملف هو أعلى مرجع حاكم للمشروع. يجب على أي مطور أو AI Agent قراءته كاملًا قبل إنشاء أو تعديل أو حذف أي كود أعمال، مخطط قاعدة بيانات، migration، نموذج Sequelize، repository، use case، controller، route، أو قاعدة مالية. عند التعارض، يفوز هذا الملف ويجب التوقف وشرح التعارض.

## النطاق والتقنيات

- النظام Backend مالي إنتاجي مبني بـ Node.js 20+ وTypeScript وExpress وMySQL 8+ وSequelize وZod وJWT وbcrypt وdecimal.js.
- المعمارية Clean Architecture: `presentation -> application -> domain`، وتنفذ `infrastructure` المنافذ المعرفة في `application`.
- Domain مستقل تمامًا عن Express وSequelize وMySQL وJWT وbcrypt وZod وHTTP.
- Application مستقل عن Express وSequelize وMySQL وHTTP.
- استعلامات Sequelize محصورة في Infrastructure repositories، ولا توضع في controller أو route أو entity أو use case.

## الجداول الثابتة المعتمدة

الجداول التجارية الوحيدة المسموح بها هي:

1. `admins`
2. `client_groups`
3. `clients`
4. `currencies`
5. `movement_types`
6. `movements`
7. `journal_entries`
8. `settlement_movements`
9. `transfer_movements`
10. `multi_movements`
11. `exchange_movements`
12. `notifications`

يسمح فقط بجداول metadata التقنية مثل `SequelizeMeta`. يمنع إنشاء أي جدول أعمال إضافي دون موافقة صريحة.

## قاعدة العميل والحساب

- لا يوجد جدول `accounts`.
- يمنع إنشاء `accounts` أو `account_balances` أو `client_accounts` أو أي تجريد حسابي مماثل.
- `CLIENT = FINANCIAL ACCOUNT`: الحقول «من حساب» و«إلى حساب» و«الحساب» تشير إلى صف في `clients`.
- لا يضاف رصيد مرجعي إلى `clients`. المصدر المالي الوحيد للحركات المرحلة هو `journal_entries`.

## قواعد المخطط وSequelize

- كل تغيير Schema يتم عبر migration قابلة للصعود والرجوع؛ يمنع `sync({ force: true })` و`sync({ alter: true })` في الإنتاج.
- نماذج Sequelize نماذج تخزين وليست Domain Entities، ويجب الفصل بينها باستخدام Mappers.
- تمنع عمليات `ON DELETE CASCADE` للسجلات المالية التاريخية؛ تستخدم `RESTRICT` أو `NO ACTION`.
- العملاء ومجموعاتهم المستخدمة تاريخيًا لا تحذف. لا يحتويان حقل `is_active` بعد اعتماد المخطط المجزأ.
- العملات المستخدمة تاريخيًا لا تحذف، بل تعطل عبر `is_active = false`.
- يمنع تغيير عمود أو قيد أو enum أو إضافة جدول/حقل أعمال خارج المواصفات دون موافقة صريحة.
- يسمح بإضافة فهرس غير مغير للسلوك، إصلاح migration معيبة، تحسين typing، أو اختبار يحفظ السلوك المقرر.

## المال والقيود

- يمنع استخدام JavaScript `Number` لحساب المال. تستخدم `decimal.js` وقيم DECIMAL النصية دون تحويل يفقد الدقة.
- `journal_entries` هو مصدر الحقيقة للأرصدة وكشوف الحساب.
- كل قيد يومية يحتوي `amount_us` (لنا) و`amount_them` (علينا). يجب أن يكون أحدهما موجبًا والآخر صفرًا، ولا يجوز أن يكونا موجبين أو صفرًا معًا.
- الرصيد الافتتاحي يحسب من القيود المرتبطة بحركات منشأة قبل `date_from`، والترتيب الثابت: `movements.created_at, journal_entries.id_day`.
- لا يرسل Frontend قيود اليومية ولا يتحكم في `movement_no` أو `created_by` أو `total_result` أو timestamps أو النتائج المالية.
- يمنع توليد `movement_no` عبر `MAX + 1` بلا قفل. استخدام `id_movement` بعد الإدراج كرقم الحركة هو الخيار الافتراضي الآمن، مع إبقاء uniqueness.

## الحركات والمعاملات

- الحوالة: `movements + transfer_movements + journal_entries`.
- التسوية والاعتماد والقبض والدفع: `movements + settlement_movements + journal_entries`.
- الحركة المتعددة: `movements + multi_movements + journal_entries`، ويسمح بعدة صفوف تفاصيل للحركة.
- التصريف: `movements + exchange_movements + journal_entries`.
- كل عملية مالية تنفذ ذريًا عبر Application `UnitOfWork` وتطبيق `SequelizeUnitOfWork`، وتستخدم جميع repositories داخلها نفس transaction.
- يمنع إنشاء transaction داخل controller أو كشف نوع Sequelize Transaction إلى Application.
- يمنع الحذف الفعلي لحركة `POSTED`. الإلغاء يغير الحالة ويحفظ التاريخ.
- العكس ينشئ حركة جديدة وقيودًا معكوسة (`US <-> THEM`) ويبقي الأصل دون تعديل. إذا احتاج الربط حقلًا جديدًا، يجب طلب موافقة قبل إضافته.

## قاعدة اتجاه القبض والدفع والتصريف — مقفلة

- `amount_us` = لنا على العميل، و`amount_them` = علينا للعميل. لا يمثلان دخول أو خروج النقد فعليًا.
- صافي الرصيد دائمًا: `SUM(amount_us) - SUM(amount_them)`. الموجب لنا، والسالب علينا، والصفر مسوّى.
- كل قيمة يعطيها العميل للنظام تسجل `THEM`، وكل قيمة يعطيها النظام للعميل تسجل `US`.
- `RECEIPT` (العميل يعطينا): اتجاه القيد `THEM`.
- `PAYMENT` (نحن نعطي العميل): اتجاه القيد `US`.
- في `EXCHANGE`: `fromCurrency/fromAmount` مستلمة من العميل واتجاهها `THEM`، و`toCurrency/toAmount` مسلمة للعميل واتجاهها `US`.
- في `TRANSFER` (معتمد 2026-09-12): «من حساب» `fromClient` يُقيَّد `US` بمبلغ `total_us` (لنا عليه)، و«إلى حساب» `toClient` يُقيَّد `THEM` بمبلغ `total_them` (علينا لصالحه). نفس اتجاه التسوية: الطرف الأول لنا والثاني علينا.
- يشتق Backend العمود المالي الذي يملؤه تلقائيًا من نوع الحركة، ويمنع على Frontend إرسال `amount_us` أو `amount_them` للحركات ذات الاتجاه المولد.
- تطبق القاعدة نفسها في CreateReceipt وCreatePayment وCreateExchange وBalanceCalculationService وJournalGenerationService وكشف ورصيد العميل.
- يمنع تغيير هذه الاتجاهات دون موافقة أعمال صريحة.

## تقييم الأرصدة بالدولار — معتمد 2026-09-13

- المعادلة في مكان واحد: `domain/services/BalanceValuationService.ts`.
- `FROM_USD_MULTIPLY`: valuedUsd = amount ÷ exchange_rate. `TO_USD_DIVIDE`: valuedUsd = amount × exchange_rate.
- تُستخدم في `GET /clients/:id/balances` و`GET /reports/balance-sheet` و`GET /dashboard` فقط؛ الفرونت يعرض القيم ولا يعيد حسابها.
- الميزانية العامة: `mode=valued` (الصندوق المقوّم: صف لكل حساب بالدولار) / `mode=currency` (صندوق العملات: صف لكل عملة)، و`detail=simple` (الحسابات ذات الرصيد فقط) / `detail=full` (الكل).

## أعلام الحساب والحسابات النظامية والإشعارات — معتمد 2026-09-13

- أُضيفت إلى `clients` (migration `20260913000100-client-account-flags`) الحقول: `account_type ENUM('CLIENT','BOX')`، `is_system`، `is_cash_box`، `is_secret`، `archived_at`، `last_rollover_at`. لا تغيير على القيود المالية.
- الحسابات النظامية (seeder `20260913000100-system-accounts`): `SYS-CASH` «الصندوق الرئيسي» (حساب الصندوق الافتراضي) و`SYS-PNL` «أرباح وخسائر التصريف». لا تُحذف ولا تُؤرشف ولا يتغير رمزها أو نوعها (`SYSTEM_CLIENT_PROTECTED`).
- الأرشفة `PATCH /clients/:id/archive {archived}`: تتطلب رصيداً صفرياً في كل العملات (`ARCHIVE_NON_ZERO_BALANCE`)، تُلغي تعيين الصندوق، والمؤرشف لا يظهر في `GET /clients` إلا مع `?archived=true`.
- حساب الصندوق واحد على الأكثر (`PATCH /clients/:id/set-cash-box` يلغي غيره؛ `GET /clients/cash-box`). الحساب السرّي (`PATCH /clients/:id/set-secret`) يظهر في `GET /clients` و`/reports/balance-sheet` لدور ADMIN فقط.
- الحذف `DELETE /clients/:id` مسموح فقط لحساب بلا أي قيد يومية (`CLIENT_HAS_MOVEMENTS`)؛ ما له تاريخ مالي يُؤرشف.
- «تدوير الأرصدة» `PATCH /clients/:id/rollover`: يثبّت `last_rollover_at` كبداية افتراضية لكشوف الحساب دون أي قيد أو حذف؛ الرصيد الافتتاحي يُحسب من القيود السابقة كما هو.
- الإشعارات (`NotifyAdmins`): كل عملية (إنشاء حركة/إلغاء/عكس، عميل، إداري، أرشفة، تدوير، تصفير) تُوزَّع على كل الإداريين النشطين؛ فشل الإشعار لا يفشل العملية.
- `POST /system/reset-data {password, confirmation:'تصفير'}` (ADMIN فقط): يحذف القيود والحركات وتفاصيلها والإشعارات والعملاء غير النظاميين ومجموعاتهم داخل معاملة واحدة؛ يبقى الإداريون والعملات وأنواع الحركات والحسابات النظامية.
- `DELETE /auth/me {password}`: يعطّل حساب الإداري الحالي (لا يحذف الصف) ويمنع تعطيل آخر ADMIN نشط (`LAST_ADMIN`).
- كشف الحساب وقيود اليومية تعيد `createdById/createdByName` للعرض.

## الترتيب والإشعارات وإعادة التفعيل — معتمد 2026-09-14

- **الأحدث أولاً** في كل القوائم: الإداريون/المجموعات/العملاء/العملات `id DESC`، الحركات `created_at DESC, id_movement DESC`، قيود اليومية وكشف الحساب `created_at DESC, id_day DESC`، الإشعارات `created_at DESC`. الرصيد الجاري في كشف الحساب (`GetClientStatement`) يُحسب تنازلياً: يبدأ من رصيد نهاية الفترة ويطرح أثر كل قيد نزولاً حتى الرصيد الافتتاحي.
- **معرّف الحركة/رقمها** (`newMovementId` في `use-cases/movements/helpers.ts`): 63 بت مرتّب زمنياً = 41 بت ميلي ثانية + 22 بت عشوائي. يضمن أن الترتيب `id DESC` يطابق ترتيب الإنشاء حتى داخل الثانية نفسها (عكس ثم إنشاء عند «تعديل الحركة» في الواجهة) ويبقى غير قابل للتخمين. المعرّفات القديمة العشوائية لا تتأثر.
- **الإشعارات** تحمل المنفّذ: `notifications.actor_id` و`actor_name` (migration `20260914000100-notification-actor`)؛ كل مسار تعديل يستدعي `notifyAs(req.auth.adminId, event)`. نص الإشعار يعرض المبالغ بلا أصفار عشرية زائدة (`trimAmount`).
- **إعادة التفعيل**: `PATCH /admins/:id/activate` (`admin.manage`) و`PATCH /currencies/:id/activate` (`currency.manage`) بجانب `deactivate`؛ إلغاء أرشفة العميل عبر `PATCH /clients/:id/archive {archived:false}`.
- `GET /movements` يقبل `currency_id` (فلتر بوجود قيد بتلك العملة) إضافةً إلى `client_id`؛ الواجهة تبني «دفتر اليومية» بصف واحد لكل حركة من هذه النقطة مع ملخص `GET /journal`.
- `GET /reports/balance-sheet` يمرّر `includeSecret` لدور ADMIN فقط.
- «تعديل الحركة» غير موجود كنقطة في الباك اند بقرار: التعديل = `POST /movements/:id/reverse` ثم إنشاء حركة جديدة من الواجهة؛ الحركات المرحّلة لا تُعدَّل في مكانها.

## الأمان وجودة الكود

- كلمات المرور تخزن bcrypt hashes فقط، ولا يعاد أو يسجل `password_hash` أو password أو JWT.
- التحقق الشكلي في Presentation عبر Zod؛ قواعد الأعمال في Application/Domain.
- أخطاء Sequelize تحول إلى أخطاء آمنة، مع تسجيل التفاصيل التقنية وعدم كشفها للعميل.
- pagination افتراضيًا 20 وبحد أقصى 100، وتجنب N+1 وحدد attributes المطلوبة.
- أهمية العميل والعملة عدد صحيح من 0 إلى 100000 للترتيب.
- صورة العملة تحفظ في `uploads/currencies` ويخزن مسارها النسبي في `currencies.icon_path`، مع `text_icon` للأيقونة النصية.
- نوع تصريف العملة `FROM_USD_MULTIPLY` أو `TO_USD_DIVIDE`.
- طبقات الاعتماد، أسماء snake_case في قاعدة البيانات، ودقة DECIMAL المحددة في المخطط إلزامية.

## الاختبارات الإلزامية

- اختبارات وحدات للمال وسعر الصرف والحسابات وحالات استخدام الحركات والأرصدة والكشف.
- اختبارات تكامل للمستودعات والعلاقات والمعاملات.
- اختبار rollback إلزامي: إذا نجح إنشاء movement وفشل detail فلا يبقى movement ولا detail ولا journal entry.
- اختبارات E2E للمصادقة والعملاء وجميع أنواع الحركات واليومية والكشف والإلغاء والعكس.

## متى يجب التوقف وطلب الموافقة

يجب التوقف قبل: إضافة/حذف جدول أعمال، إضافة حقل أعمال غير معتمد، تغيير معادلة مالية، تغيير دلالة `US/THEM`، إدخال accounts، تغيير سياسة الإلغاء/العكس، hard delete مالي، أو كسر اتجاه اعتماد Clean Architecture.

## تدقيق إلزامي قبل الإنهاء

أعد قراءة القواعد ذات الصلة وتأكد: لا جدول غير معتمد، لا accounts، لا Sequelize خارج Infrastructure، لا حساب مالي بـ Number، لا ثقة بحسابات Frontend، لا سجل مالي خارج transaction، لا hard delete، ولا تغيير أعمال بلا موافقة. أصلح أي مخالفة قبل التسليم.
