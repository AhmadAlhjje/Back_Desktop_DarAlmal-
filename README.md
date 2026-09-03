# ميزان — النظام المالي

Backend مالي مبني بـNode.js 20 وTypeScript وExpress وMySQL 8 وSequelize وفق Clean Architecture. العميل هو الحساب المالي، و`journal_entries` هو مصدر الحقيقة الوحيد للأرصدة.

## المتطلبات

- Node.js 20+
- MySQL 8+
- قاعدة بيانات فارغة بترميز `utf8mb4`

## التشغيل

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

على Windows PowerShell استخدم `Copy-Item .env.example .env`. اضبط اتصال MySQL و`JWT_SECRET` بطول 32 محرفًا على الأقل قبل التشغيل.

لإنشاء مدير أول اختياريًا، اضبط `INITIAL_ADMIN_NAME` و`INITIAL_ADMIN_USERNAME` و`INITIAL_ADMIN_PASSWORD` قبل `npm run db:seed`. تُشفّر كلمة المرور بـbcrypt ولا تُخزن كنص صريح.

## المعمارية

- `src/domain`: الكيانات والقيم المالية والقواعد الخالصة.
- `src/application`: حالات الاستخدام ومنافذ repositories والخدمات.
- `src/infrastructure`: Sequelize وMySQL وJWT وbcrypt وPino.
- `src/presentation`: Express وZod والمسارات والـmiddleware.
- `src/container`: Composition Root وربط الاعتماديات.
- `database`: migrations وseeders وإعداد Sequelize CLI.

اتجاه الاعتماد هو Presentation → Application → Domain. تنفذ Infrastructure المنافذ الداخلية، ولا تستخدم طبقات Domain أوApplication أوPresentation استعلامات Sequelize.

## قاعدة البيانات

الجداول التجارية المعتمدة فقط:

`admins`, `client_groups`, `clients`, `currencies`, `movement_types`, `movements`, `journal_entries`, `transfer_details`, `exchange_details`, `receipt_payment_details`, `notifications`.

لا يوجد جدول accounts؛ صف `clients` هو الحساب المالي. لا تحفظ الأرصدة في clients، بل تُحسب من قيود الحركات `POSTED`.

تطور المخطط يتم عبر migrations فقط:

```bash
npm run db:migrate
npm run db:migrate:undo
npm run db:seed
```

لا يستخدم المشروع `sync({ force: true })` أو `sync({ alter: true })`، ولا يستخدم `ON DELETE CASCADE` للسجل المالي.

## القاعدة المالية

- `US`: لنا على العميل.
- `THEM`: علينا للعميل.
- الصافي: `totalUS - totalTHEM`.
- القبض: `THEM`.
- الدفع: `US`.
- التصريف: العملة المستلمة من العميل `THEM`، والمسلّمة إليه `US`.
- الحسابات المالية تستخدم `decimal.js` وقيم DECIMAL النصية، وليس JavaScript Number.

كل حركة مالية تنفذ ذريًا بواسطة `SequelizeUnitOfWork`. أي فشل في الرأس أو التفاصيل أو القيود يؤدي إلى rollback كامل.

## الحركات

- الحوالة: movement + transfer detail + journal entries.
- التسوية والمتعددة: movement + journal entries.
- القبض والدفع: movement + receipt/payment detail + journal entry.
- التصريف: movement + exchange detail + journal entries.
- الإلغاء يغيّر الحالة دون حذف.
- العكس ينشئ حركة جديدة وقيودًا مع تبديل `US/THEM`، ثم يعلّم الأصل `REVERSED`.

## أهم المسارات

- `POST /api/v1/auth/login`
- `GET|POST|PATCH /api/v1/admins`
- `GET|POST|PATCH /api/v1/client-groups`
- `GET|POST|PATCH /api/v1/clients`
- `GET|POST|PATCH /api/v1/currencies`
- `GET|PATCH /api/v1/movement-types`
- `POST /api/v1/movements/transfers`
- `POST /api/v1/movements/settlements`
- `POST /api/v1/movements/multi`
- `POST /api/v1/movements/receipts`
- `POST /api/v1/movements/payments`
- `POST /api/v1/movements/exchanges`
- `GET /api/v1/movements/:id`
- `POST /api/v1/movements/:id/cancel`
- `POST /api/v1/movements/:id/reverse`
- `GET /api/v1/journal`
- `GET /api/v1/clients/:id/statement`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`

جميع المسارات، عدا تسجيل الدخول وhealth، تتطلب JWT والصلاحية المناسبة. الاستجابات الخاطئة موحدة ولا تكشف أخطاء Sequelize أو SQL.

## كشف الحساب

يدعم العملة، الفترة، نوع الحركة، الصفحة، والحد. يحسب الرصيد الافتتاحي من القيود السابقة لـ`date_from`، ثم الرصيد الجاري بترتيب ثابت:

`movement_date, movement_time, movement_id, line_no`.

## السجلات والأمان

- Helmet وCORS وrate limiting.
- Pino logging مع `requestId` وإخفاء password وhash وJWT وAuthorization.
- تحويل أخطاء uniqueness وforeign key والتحقق والاتصال إلى أخطاء API آمنة.
- لا يوجد hard delete للحركات أو العملاء أو العملات.

## الجودة والاختبارات

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

الاختبارات الحالية تغطي المال والدقة، الحسابات، اتجاهات القبض والدفع والتصريف، إنشاء الحركات، rollback المنطقي، كشف الحساب، الإلغاء والعكس، إدارة البيانات، وإخفاء كلمات المرور وخريطة أخطاء قاعدة البيانات.

اختبارات التكامل وE2E التي تتصل بـMySQL تحتاج قاعدة اختبار مستقلة عبر `DB_TEST_NAME`. لا تشغّلها على قاعدة الإنتاج.

## المرجع الحاكم

يجب قراءة `role.md` قبل أي تعديل متعلق بالأعمال أو قاعدة البيانات. يمنع إضافة جدول أو حقل أعمال أو تغيير قاعدة مالية دون موافقة صريحة.
