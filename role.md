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
- يشتق Backend العمود المالي الذي يملؤه تلقائيًا من نوع الحركة، ويمنع على Frontend إرسال `amount_us` أو `amount_them` للحركات ذات الاتجاه المولد.
- تطبق القاعدة نفسها في CreateReceipt وCreatePayment وCreateExchange وBalanceCalculationService وJournalGenerationService وكشف ورصيد العميل.
- يمنع تغيير هذه الاتجاهات دون موافقة أعمال صريحة.

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
