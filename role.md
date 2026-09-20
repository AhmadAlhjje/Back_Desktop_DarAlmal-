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
- **معرّف الحركة/رقمها** — (مُلغى 2026-09-17؛ انظر «أرقام الحركات المتسلسلة» أدناه). كان `newMovementId` معرّفاً 63 بت مرتّباً زمنياً؛ الترتيب `id DESC` ما زال يطابق ترتيب الإنشاء لأن الأرقام المتسلسلة تصاعدية.
- **الإشعارات** تحمل المنفّذ: `notifications.actor_id` و`actor_name` (migration `20260914000100-notification-actor`)؛ كل مسار تعديل يستدعي `notifyAs(req.auth.adminId, event)`. نص الإشعار يعرض المبالغ بلا أصفار عشرية زائدة (`trimAmount`).
- **إعادة التفعيل**: `PATCH /admins/:id/activate` (`admin.manage`) و`PATCH /currencies/:id/activate` (`currency.manage`) بجانب `deactivate`؛ إلغاء أرشفة العميل عبر `PATCH /clients/:id/archive {archived:false}`.
- `GET /movements` يقبل `currency_id` (فلتر بوجود قيد بتلك العملة) إضافةً إلى `client_id`؛ الواجهة تبني «دفتر اليومية» بصف واحد لكل حركة من هذه النقطة مع ملخص `GET /journal`.
- `GET /reports/balance-sheet` يمرّر `includeSecret` لدور ADMIN فقط.
- (مُلغى 2026-09-15 — انظر «العكس والتعديل في مكانهما» أدناه.)
- الحركة تعيد `createdAt/updatedAt` (ISO) و`GET /movements/:id` يعيد `updatedBy` (الإداري الذي ألغى/عكس) لعرض «آخر تعديل بواسطة/الوقت».

## الدقة العشرية 10 منازل — معتمد 2026-09-14

- قرار المستخدم: المبالغ والأسعار ليست محدودة بمنزلتين أو أربع؛ تُخزَّن وتُعاد بعشر منازل عشرية. migration `20260914000200-decimal-precision-10`: المبالغ `DECIMAL(20,4)` → `DECIMAL(30,10)`، الأسعار `DECIMAL(20,8)` → `DECIMAL(30,10)`، نسب الأجور `DECIMAL(10,4)` → `DECIMAL(20,10)` (توسيع بلا تغيير قيم).
- الثوابت في `domain/value-objects/Precision.ts`: `AMOUNT_SCALE = RATE_SCALE = 10`، `ZERO_AMOUNT`، `UNIT_RATE`، `DECIMAL_PATTERN = /^\d+(\.\d{1,10})?$/` (كل validators تستعمله)، و`isZeroAmount()` بدل أي مقارنة نصية مع `'0.0000'`. **يُمنع** `toFixed(4)`/`toFixed(8)` أو أرقام سحرية للدقة خارج هذا الملف.
- `currencies.decimal_places` (0..10) معلومة وصفية للعرض فقط ولا تؤثر في أي حساب.

## العملات الأساسية — معتمد 2026-09-15

- الأربع الثابتة: `USD` دولار، `SYP` ليرة سوري، `EUR` يورو، `TRY` ليرة تركي — تُبذر مع النظام (`20260902000100-master-data` للتثبيت الجديد، و`20260915000100-system-currencies` يعلّم الموجود ويكمّل الناقص) وتحمل `is_system = 1` (migration `20260915000100-currency-is-system`).
- `ManageCurrencies.update` على عملة أساسية يقبل تغيير `exchangeRate`/`exchangeType` فقط؛ أي تغيير فعلي في الاسم/الرمز/الرمز النصي/العلم/الأهمية/التفعيل يُرفض بـ `SYSTEM_CURRENCY_PROTECTED` (409). القيم المطابقة للحالية لا تُعدّ تغييراً. `deactivate` مرفوض لها. **سعر الدولار قابل للتعديل كباقي العملات** (قرار المستخدم 2026-09-17؛ أُزيل الرفض `BASE_CURRENCY_RATE_LOCKED`): التقييم بالدولار (`BalanceValuationService`) يستعمل `exchange_rate/exchange_type` المخزّنين لكل عملة بما فيها `USD`، فلا يُفترض 1 في أي مكان.
- ما يُضاف من الواجهة عملة عادية (`is_system = 0`) حرّة التعديل والتعطيل. لا حذف للعملات عبر الـ API.
- البذور الوهمية (`demo-data`, `demo-notifications`) لا تعمل إلا مع `SEED_DEMO_DATA=true` حتى تبقى النسخ المسلَّمة نظيفة.
- `resetBusinessData`: ترتيب الحذف القيود ← تفاصيل الحركات ← **الإشعارات** ← الحركات ← العملاء غير النظاميين ← المجموعات (الإشعارات تشير إلى الحركات بقيد RESTRICT).

## العكس والتعديل في مكانهما + البثّ الفوري — معتمد 2026-09-15

- **عكس الحركة في مكانها** (`POST /movements/:id/reverse`, `ReverseMovement`): لا تُنشأ حركة عكسية؛ تُقلب أطراف الحركة نفسها بنفس الرقم: قيود اليومية `flipSides` (لنا ↔ علينا)، الحوالة `swapSides` (من ↔ إلى بكل حقولهما)، التصريف (العملتان والمجاميع تتبادلان، السعر = 1 ÷ السعر، النتيجة تُعكس)، القبض ↔ الدفع (نوع الحركة و`movement_kind`)، `total_result` يُعكس. تبقى `POSTED` فتُحتسب بأثرها الجديد؛ `movements.reversed_at/reversed_by` (migration `20260915000200`) يوثّقان العكس، وعكسها مجدداً يعيدها ويمسح العلم. الرد `{ movement, reversed }`. «الإلغاء» يبقى الوسيلة لإزالة الأثر كلياً.
- **تعديل الحركة في مكانها** (`PUT /movements/{transfers|settlements|multi|receipts|payments|exchanges}/:id`، يحتاج `movement.create` **و**`movement.reverse`): `Create*.replace(id, input, adminId)` يعيد التحقق والحساب نفسه (`prepare`) ثم `clearContents` (حذف القيود وصفوف التفاصيل) وإعادة الكتابة بنفس المعرّف وبتاريخ/وقت الحركة الأصلية، ويحدّث الرأس (`updateContents`: client/description/total_result/updated_by، ولسند القبض/الدفع النوع). لا يُسمح إلا لحركة `POSTED` ومن النوع نفسه (`MOVEMENT_TYPE_MISMATCH`). الرد `{ movement, detail?, changes[] }`.
- `PATCH /auth/me/password` (`ChangeOwnPassword`، أي مستخدم مصادَق): يتحقق من كلمة المرور الحالية بـ bcrypt، يرفض تكرارها (`SAME_PASSWORD`) والأقصر من 8 محارف (Zod)، ويخزّن hash الجديدة فقط. لا تُسجَّل كلمة مرور ولا تُعاد في أي رد.
- **لا إشعار عند إنشاء الحركات** (قرار المستخدم 2026-09-15): إشعارات الحركات للتعديل والعكس والإلغاء فقط.
- **إشعار التعديل**: `describeMovement()` يصف الحركة بالعربية (أسماء لا معرّفات) قبل وبعد، و`diffDescriptions()` يعطي الفروق، والرسالة «تعديل حوالة #N: المبلغ: من 1000 إلى 1200؛ إلى حساب: من أحمد إلى باسل».
- **بثّ فوري (SSE)**: `GET /notifications/stream` (مصادقة Bearer) يبقى مفتوحاً ويرسل `event: notification` لكل إشعار جديد للإداري الحالي لحظة إنشائه (`NotificationHub` في `infrastructure/realtime` عبر منفذ `NotificationPublisher` المحقون في `NotifyAdmins`)، مع نبضة كل 20 ث. الواجهة تعتمده بدل الاستطلاع (الاستطلاع كل 60 ث احتياط).
- **لا تعتمد على عدد الصفوف المتأثرة** في `update` لتقرير الوجود: MySQL يعيد 0 عندما لا تتغير القيم، فتعديلٌ بلا تغيير كان يصبح 404؛ الوجود يُقرَّر بـ `findByPk` بعد التحديث.
- `trimAmount/describeMovement/diffDescriptions/formatChanges` في `use-cases/movements/helpers.ts`؛ `loadEditableMovement` في `editing.ts`.

## أرقام الحركات المتسلسلة — معتمد 2026-09-17

- رقم الحركة = `id_movement` = `movement_no` = **1، 2، 3…** يولّده `MovementRepository.nextNumber()` داخل معاملة الإنشاء: `SELECT id_movement … ORDER BY id_movement DESC LIMIT 1 FOR UPDATE` ثم +1 (القفل يمنع التكرار عند التزامن، وهو الاستثناء المعتمد من قاعدة «لا `MAX + 1` بلا قفل»). لا معرّفات عشوائية بعد الآن؛ `newMovementId` حُذف.
- هجرة `20260917000100-sequential-movement-numbers` تعيد ترقيم الحركات الموجودة حسب `created_at` إلى 1..N عبر مرحلة وسيطة بأرقام قرب أقصى `bigint unsigned` (العمود unsigned فلا تصلح السالبة)، وتتبعها الجداول التابعة تلقائياً (`journal_entries`, `transfer/exchange/settlement/multi_movements`, `notifications` كلها `ON UPDATE CASCADE`)، ثم تضبط `AUTO_INCREMENT = N+1`. لا `down`.
- الواجهة تعرض الرقم كما يأتي (نصي)؛ لا تعتمد على طوله.

## تعدد المكاتب في باك اند واحد + الترخيص — معتمد 2026-09-20

- **النموذج**: باك اند واحد وقاعدة واحدة لكل المكاتب (المستأجرين). جدول `offices` (`id_office`, `code` فريد 8 محارف من الأبجدية غير الملتبسة، `name`, `status` ENUM ACTIVE/SUSPENDED/EXPIRED, `expires_at`, `message`, `phone`, `address`, `notes`). كل جدول تجاري يحمل `office_id` (FK RESTRICT): `admins, client_groups, clients, currencies, movements, journal_entries, notifications`؛ الجداول المرجعية (`movement_types`) وتفاصيل الحركات (مرتبطة بحركة) بلا `office_id`. هجرة `20260921000100-offices` تنشئ مكتباً افتراضياً (`DEFAULT_OFFICE_CODE`/`DEFAULT_OFFICE_NAME` أو كود مولَّد يُطبع في السجل) وتنسب إليه كل البيانات الموجودة.
- **القيود الفريدة لكل مكتب**: `(office_id, full_name)` و`(office_id, email)` للإداريين، `(office_id, client_code)`، `(office_id, currency_code)`، `(office_id, movement_no)`. **رقم الحركة** `movement_no` متسلسل لكل مكتب (`nextNumber` بقفل `FOR UPDATE` مقيّد بالمكتب)، و`id_movement` معرّف عام تمنحه القاعدة (لا يساوي الرقم).
- **العزل (شبكة الأمان)**: `infrastructure/tenancy/TenantContext.ts` (AsyncLocalStorage) + `sequelize/tenancy-hooks.ts`: خطّافات عامة تضيف `office_id = <مكتب الطلب>` إلى كل `find/count/update/destroy` على الجداول المقيّدة وتختم كل `create/bulkCreate`، وترمي `TenantContextMissingError` خارج أي سياق (لا استعلام «عالمياً» بالخطأ). الاستعلامات الخام تقيّد نفسها صراحةً بـ `requireTenant(...)` (التقارير، `nextNumber`، `resetBusinessData`). تجاوز صريح للمنصّة فقط: الخيار `allOffices: true`. **يُمنع** أي استعلام على جدول مقيّد خارج `runWithTenant` أو دون هذا الخيار.
- **المصادقة**: `POST /auth/login { officeCode, fullName, password }` — الكود يُطبَّع (`normalizeOfficeCode`) ويحدّد المكتب (`OFFICE_NOT_FOUND` 404)، ثم يُفحص ترخيصه (403 `LICENSE_*`)، ثم كلمة المرور داخل سياق المكتب. التوكن يحمل `officeId` و`officeCode`، والرد يحمل `office { id, code, name }`. `authenticate` يتحقق من التوكن، يفحص ترخيص مكتبه، ثم يشغّل بقية الطلب داخل `scope.run(officeId)`. توكن قديم بلا `officeId` ⇒ 401.
- **الترخيص**: `LicenseMonitor` لكل مكتب (ذاكرة 5 ث، استطلاع `offices` كل `LICENSE_POLL_SECONDS` وبثّ التغيّر عبر `NotificationHub.publishLicense(officeId, state)` → حدث SSE `license` لأجهزة ذلك المكتب فقط). `GET /license?office=<الكود>` بلا مصادقة لشاشة القفل. مكتب غير موجود = موقوف؛ تعذّر القراءة يُبقي آخر حالة (لا قفل بالخطأ).
- **واجهة المنصّة** `/api/v1/platform/*` (لوحة التحكم فقط، مفتاح `X-Platform-Key` = `PLATFORM_API_KEY` ≥ 32 محرفاً، مقارنة ثابتة الزمن): `GET /overview`، `GET/POST /offices`، `GET/PATCH /offices/:id`، `PUT /offices/:id/license`، `GET/POST /offices/:id/admins`، `PUT .../admins/:adminId/password`، `PATCH .../admins/:adminId/activate|deactivate`. `ManageOffices.create` يولّد الكود ويبذر في معاملة واحدة داخل سياق المكتب الجديد: العملات الأربع الأساسية، `SYS-CASH`/`SYS-PNL`، ومدير المكتب الأول بكل الصلاحيات. `ManageOfficeAdmins` تعمل داخل سياق المكتب المطلوب فلا تمسّ مكتباً آخر. الإحصاءات (`PlatformStatsRepository`) استعلامات خام عبر كل المكاتب عمداً.
- **البذور**: تعتمد `database/lib/defaultOffice.cjs` لختم `office_id` بالمكتب الافتراضي. المكاتب الجديدة تُبذر من المنصّة لا من البذور.

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
