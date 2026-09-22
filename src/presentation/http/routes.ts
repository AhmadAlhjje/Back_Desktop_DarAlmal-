import { Router, type RequestHandler } from 'express';
import type { Login } from '../../application/use-cases/auth/Login.js';
import type { CreateClient } from '../../application/use-cases/clients/CreateClient.js';
import type { CreateTransfer } from '../../application/use-cases/movements/CreateTransfer.js';
import type { CreateJournalMovement } from '../../application/use-cases/movements/CreateJournalMovement.js';
import type { TokenService } from '../../application/ports/services/TokenService.js';
import { validate, validateQuery } from './middleware/validate.js';
import { authenticate, authorize, requireMovementQuota } from './middleware/authenticate.js';
import { changePasswordSchema, loginSchema } from './validators/authSchemas.js';
import { createClientSchema } from './validators/clientSchemas.js';
import { createTransferSchema } from './validators/transferSchemas.js';
import { createJournalMovementSchema } from './validators/journalMovementSchemas.js';
import type { CreateReceiptPayment } from '../../application/use-cases/movements/CreateReceiptPayment.js';
import type { CreateExchange } from '../../application/use-cases/movements/CreateExchange.js';
import { ReceiptPaymentType } from '../../domain/enums/ReceiptPaymentType.js';
import { roleLabelAr } from '../../domain/enums/AdminRoleLabel.js';
import { noticeBlocks } from '../../domain/entities/PlatformNotice.js';
import type { SystemNotice } from '../../application/use-cases/platform/SystemNotice.js';
import { receiptPaymentSchema } from './validators/receiptPaymentSchemas.js';
import { exchangeSchema } from './validators/exchangeSchemas.js';
import type { GetJournal } from '../../application/use-cases/journal/GetJournal.js';
import type { GetClientStatement } from '../../application/use-cases/journal/GetClientStatement.js';
import {
  balanceSheetQuerySchema,
  balancesQuerySchema,
  journalQuerySchema,
  movementsQuerySchema,
  statementQuerySchema,
} from './validators/querySchemas.js';
import type { GetMovementDetails } from '../../application/use-cases/movements/GetMovementDetails.js';
import type { ListMovements } from '../../application/use-cases/movements/ListMovements.js';
import type { GetClientBalances } from '../../application/use-cases/reports/GetClientBalances.js';
import type { GetBalanceSheet } from '../../application/use-cases/reports/GetBalanceSheet.js';
import type { GetDashboard } from '../../application/use-cases/reports/GetDashboard.js';
import type { CancelMovement } from '../../application/use-cases/movements/CancelMovement.js';
import type { ReverseMovement } from '../../application/use-cases/movements/ReverseMovement.js';
import type { GetNotifications } from '../../application/use-cases/notifications/GetNotifications.js';
import type { MarkNotificationRead } from '../../application/use-cases/notifications/MarkNotificationRead.js';
import { paginationQuerySchema } from './validators/querySchemas.js';
import type { ManageClients } from '../../application/use-cases/clients/ManageClients.js';
import type { ManageClientGroups } from '../../application/use-cases/client-groups/ManageClientGroups.js';
import type { ManageCurrencies } from '../../application/use-cases/currencies/ManageCurrencies.js';
import { updateClientSchema } from './validators/clientSchemas.js';
import {
  createClientGroupSchema,
  updateClientGroupSchema,
  createCurrencySchema,
  updateCurrencySchema,
} from './validators/masterDataSchemas.js';
import type { ManageAdmins } from '../../application/use-cases/admins/ManageAdmins.js';
import type { ManageMovementTypes } from '../../application/use-cases/movement-types/ManageMovementTypes.js';
import { createAdminSchema, updateAdminSchema } from './validators/adminSchemas.js';
import { updateMovementTypeSchema } from './validators/movementTypeSchemas.js';
import { uploadCurrencyIcon } from './middleware/currencyIconUpload.js';
import { ApplicationError } from '../../application/errors/ApplicationError.js';
import type { NotifyAdmins, NotificationEvent } from '../../application/use-cases/notifications/NotifyAdmins.js';
import type { NotificationHub } from '../../infrastructure/realtime/NotificationHub.js';
import type { LicenseMonitor } from '../../application/use-cases/license/LicenseMonitor.js';
import type { TenantScope } from '../../application/ports/services/TenantScope.js';
import type { OfficeRepository } from '../../application/ports/repositories/OfficeRepository.js';
import type { AdminRepository } from '../../application/ports/repositories/AdminRepository.js';
import type { OfficeDeviceRepository } from '../../application/ports/repositories/OfficeDeviceRepository.js';
import { hashDeviceKey } from '../../application/use-cases/auth/Login.js';
import { normalizeOfficeCode, officePublicInfo } from '../../domain/entities/Office.js';
import type { Logger } from '../../application/ports/services/Logger.js';
import { formatChanges, trimAmount, type MovementChange } from '../../application/use-cases/movements/helpers.js';
import type { ResetSystemData } from '../../application/use-cases/system/ResetSystemData.js';
import type { ChangeOwnPassword } from '../../application/use-cases/admins/ChangeOwnPassword.js';
import type { DeleteOwnAccount } from '../../application/use-cases/admins/DeleteOwnAccount.js';
import { archiveClientSchema, secretClientSchema } from './validators/clientSchemas.js';
import { clientsQuerySchema } from './validators/querySchemas.js';
import { deleteOwnAccountSchema, resetDataSchema } from './validators/systemSchemas.js';
import type { Movement } from '../../domain/entities/Movement.js';

/** نصوص الإشعارات العربية (قرار د9): عنوان + وصف مختصر لكل عملية. */
const MOVEMENT_LABELS: Record<string, string> = {
  TRANSFER: 'حوالة',
  SETTLEMENT: 'تسوية',
  MULTI: 'حركة متعددة',
  RECEIPT: 'سند قبض',
  PAYMENT: 'سند دفع',
  EXCHANGE: 'تصريف',
};
// قرار المستخدم 2026-09-15: لا إشعار عند إنشاء الحركات — الإشعارات للتعديل والعكس والإلغاء فقط.
/** إشعار تعديل حركة في مكانها: «تعديل من كذا إلى كذا» لكل حقل تغيّر. */
const movementEdited = (kind: string, m: Movement, changes: MovementChange[]): NotificationEvent => ({
  type: 'MOVEMENT',
  movementId: m.id,
  title: `تعديل ${MOVEMENT_LABELS[kind] ?? kind} #${m.movementNo}`,
  message: `تم تعديل ${MOVEMENT_LABELS[kind] ?? kind} رقم ${m.movementNo}: ${formatChanges(changes)}.`,
});
const asyncRoute =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
export function createRoutes(deps: {
  login: Login;
  manageAdmins: ManageAdmins;
  manageMovementTypes: ManageMovementTypes;
  createClient: CreateClient;
  manageClients: ManageClients;
  manageClientGroups: ManageClientGroups;
  manageCurrencies: ManageCurrencies;
  createTransfer: CreateTransfer;
  createJournalMovement: CreateJournalMovement;
  createReceiptPayment: CreateReceiptPayment;
  createExchange: CreateExchange;
  getJournal: GetJournal;
  getClientStatement: GetClientStatement;
  getMovementDetails: GetMovementDetails;
  listMovements: ListMovements;
  getClientBalances: GetClientBalances;
  getBalanceSheet: GetBalanceSheet;
  getDashboard: GetDashboard;
  cancelMovement: CancelMovement;
  reverseMovement: ReverseMovement;
  getNotifications: GetNotifications;
  markNotificationRead: MarkNotificationRead;
  notifyAdmins: NotifyAdmins;
  notificationHub: NotificationHub;
  licenseMonitor: LicenseMonitor;
  tenantScope: TenantScope;
  offices: OfficeRepository;
  officeDevices: OfficeDeviceRepository;
  admins: AdminRepository;
  logger: Logger;
  resetSystemData: ResetSystemData;
  deleteOwnAccount: DeleteOwnAccount;
  changeOwnPassword: ChangeOwnPassword;
  systemNotice: SystemNotice;
  tokens: TokenService;
}) {
  const router = Router();
  /**
   * إعلان المنصّة (قرار المستخدم 2026-09-23) — بلا مصادقة: يستعلمه التطبيق **عند الإقلاع**
   * (وكل 30 ثانية وهو مقفل) فقط. لا يُفحص في `authenticate` عمداً: من كان داخل التطبيق يُكمل
   * عمله ولا تظهر له الرسالة حتى يخرج ويعود أو يسجّل دخولاً جديداً.
   */
  router.get(
    '/system/notice',
    asyncRoute(async (_req, res) => {
      const notice = await deps.systemNotice.current();
      res.json({
        success: true,
        data: {
          active: noticeBlocks(notice),
          title: notice.title,
          message: notice.message,
          updatedAt: notice.updatedAt,
        },
      });
    }),
  );
  // حالة ترخيص مكتب — بلا مصادقة (شاشة القفل تستعلم قبل الدخول وبعده): `?office=<الكود>`.
  router.get(
    '/license',
    asyncRoute(async (req, res) => {
      // بمفتاح الجهاز (التطبيق بعد التفعيل) أو بكود المكتب (لوحة التحكم/الفحص)
      const deviceKey = req.header('x-device-key') ?? (typeof req.query.device === 'string' ? req.query.device : '');
      let office = null;
      if (deviceKey) {
        const device = await deps.officeDevices.findActiveByKeyHash(hashDeviceKey(deviceKey));
        if (!device) throw new ApplicationError('DEVICE_NOT_FOUND', 'هذا الجهاز غير مسجَّل — أدخل كود المكتب', 404);
        office = await deps.offices.findById(device.officeId);
      } else {
        const code = typeof req.query.office === 'string' ? normalizeOfficeCode(req.query.office) : '';
        if (!code) throw new ApplicationError('VALIDATION_ERROR', 'office code or device key is required', 422);
        office = await deps.offices.findByCode(code);
      }
      if (!office) throw new ApplicationError('OFFICE_NOT_FOUND', 'كود المكتب غير صحيح', 404);
      res.json({
        success: true,
        data: {
          ...(await deps.licenseMonitor.current(office.id)),
          office: officePublicInfo(office),
        },
      });
    }),
  );
  const notifyAs = (actorId: string | undefined, event: NotificationEvent) =>
    void deps.notifyAdmins.execute({ ...event, actorId: actorId ?? null });
  router.post(
    '/auth/login',
    validate(loginSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.login.execute(req.body) });
    }),
  );
  router.get(
    '/admins',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('admin.manage'),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.manageAdmins.list(q.page, q.limit) });
    }),
  );
  router.post(
    '/admins',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('admin.manage'),
    validate(createAdminSchema),
    asyncRoute(async (req, res) => {
      const admin = await deps.manageAdmins.create(req.body);
      notifyAs(req.auth?.adminId, { type: 'ADMIN', title: 'إداري جديد', message: `تمت إضافة الإداري «${admin.fullName}» بدور ${roleLabelAr(admin.role)}.` });
      res.status(201).json({ success: true, data: admin });
    }),
  );
  router.patch(
    '/admins/:id',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('admin.manage'),
    validate(updateAdminSchema),
    asyncRoute(async (req, res) => {
      const admin = await deps.manageAdmins.update(req.params.id, req.body);
      notifyAs(req.auth?.adminId, { type: 'ADMIN', title: 'تحديث إداري', message: `تم تحديث بيانات الإداري «${admin.fullName}».` });
      res.json({ success: true, data: admin });
    }),
  );
  router.patch(
    '/admins/:id/activate',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('admin.manage'),
    asyncRoute(async (req, res) => {
      const admin = await deps.manageAdmins.activate(req.params.id);
      deps.notificationHub.publishAccount(admin.id, { isActive: true });
      notifyAs(req.auth?.adminId, { type: 'ADMIN', title: 'إعادة تفعيل إداري', message: `أُعيد تفعيل حساب الإداري «${admin.fullName}».` });
      res.json({ success: true, data: admin });
    }),
  );
  router.patch(
    '/admins/:id/deactivate',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('admin.manage'),
    asyncRoute(async (req, res) => {
      const admin = await deps.manageAdmins.deactivate(req.params.id, req.auth!.adminId);
      // القفل يصل فوراً لأجهزة الإداري المعطَّل عبر البثّ.
      deps.notificationHub.publishAccount(admin.id, { isActive: false });
      notifyAs(req.auth?.adminId, { type: 'ADMIN', title: 'تعطيل إداري', message: `تم تعطيل حساب الإداري «${admin.fullName}».` });
      res.json({ success: true, data: admin });
    }),
  );
  router.get(
    '/movement-types',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.view'),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.manageMovementTypes.list(q.page, q.limit) });
    }),
  );
  router.patch(
    '/movement-types/:id',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('admin.manage'),
    validate(updateMovementTypeSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageMovementTypes.update(req.params.id, req.body) });
    }),
  );
  router.post(
    '/clients',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.create'),
    validate(createClientSchema),
    asyncRoute(async (req, res) => {
      const client = await deps.createClient.execute(req.body);
      notifyAs(req.auth?.adminId, {
        type: 'CLIENT',
        title: client.accountType === 'BOX' ? `صندوق جديد: ${client.fullName}` : `عميل جديد: ${client.fullName}`,
        message: `تم تسجيل الحساب «${client.fullName}».`,
      });
      res.status(201).json({ success: true, data: client });
    }),
  );
  router.get(
    '/clients',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.view'),
    validateQuery(clientsQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({
        success: true,
        data: await deps.manageClients.list(q.page, q.limit, {
          archived: q.archived === 'true',
          includeSecret: req.auth!.role === 'ADMIN',
        }),
      });
    }),
  );
  router.get(
    '/clients/cash-box',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.view'),
    asyncRoute(async (_req, res) => {
      res.json({ success: true, data: await deps.manageClients.cashBox() });
    }),
  );
  router.patch(
    '/clients/:id',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.update'),
    validate(updateClientSchema),
    asyncRoute(async (req, res) => {
      const client = await deps.manageClients.update(req.params.id, req.body);
      notifyAs(req.auth?.adminId, { type: 'CLIENT', title: `تحديث حساب: ${client.fullName}`, message: `تم تحديث بيانات الحساب «${client.fullName}».` });
      res.json({ success: true, data: client });
    }),
  );
  router.patch(
    '/clients/:id/archive',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.update'),
    validate(archiveClientSchema),
    asyncRoute(async (req, res) => {
      const archived = req.body.archived !== false;
      const client = await deps.manageClients.archive(req.params.id, archived);
      notifyAs(req.auth?.adminId, {
        type: 'CLIENT',
        title: archived ? `أرشفة حساب: ${client.fullName}` : `إلغاء أرشفة حساب: ${client.fullName}`,
        message: archived
          ? `تمت أرشفة الحساب «${client.fullName}» بعد تصفير أرصدته.`
          : `أُعيد الحساب «${client.fullName}» من الأرشيف.`,
      });
      res.json({ success: true, data: client });
    }),
  );
  router.patch(
    '/clients/:id/set-cash-box',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.update'),
    asyncRoute(async (req, res) => {
      const client = await deps.manageClients.setCashBox(req.params.id);
      notifyAs(req.auth?.adminId, {
        type: 'CLIENT',
        title: 'تعيين حساب الصندوق',
        message: `أصبح «${client.fullName}» هو حساب الصندوق لسندات القبض والدفع.`,
      });
      res.json({ success: true, data: client });
    }),
  );
  router.patch(
    '/clients/:id/set-secret',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.update'),
    validate(secretClientSchema),
    asyncRoute(async (req, res) => {
      const client = await deps.manageClients.setSecret(req.params.id, req.body.isSecret);
      notifyAs(req.auth?.adminId, {
        type: 'CLIENT',
        title: `${client.isSecret ? 'تعيين حساب سرّي' : 'إلغاء السرّية'}: ${client.fullName}`,
        message: client.isSecret
          ? `أصبح الحساب «${client.fullName}» سرّياً ولا يظهر إلا لدور المدير.`
          : `أُلغيت سرّية الحساب «${client.fullName}» فصار ظاهراً للجميع.`,
      });
      res.json({ success: true, data: client });
    }),
  );
  router.patch(
    '/clients/:id/rollover',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.update'),
    asyncRoute(async (req, res) => {
      const client = await deps.manageClients.rollover(req.params.id);
      notifyAs(req.auth?.adminId, {
        type: 'CLIENT',
        title: `تدوير أرصدة: ${client.fullName}`,
        message: `تم تدوير أرصدة الحساب «${client.fullName}»؛ تبدأ كشوف الحساب الجديدة من هذه اللحظة.`,
      });
      res.json({ success: true, data: client });
    }),
  );
  router.delete(
    '/clients/:id',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.update'),
    asyncRoute(async (req, res) => {
      const result = await deps.manageClients.delete(req.params.id);
      notifyAs(req.auth?.adminId, {
        type: 'CLIENT',
        title: `حذف حساب: ${result.fullName}`,
        message: `تم حذف الحساب «${result.fullName}» نهائياً (لا حركات عليه).`,
      });
      res.json({ success: true, data: result });
    }),
  );
  router.get(
    '/client-groups',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.view'),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.manageClientGroups.list(q.page, q.limit) });
    }),
  );
  router.post(
    '/client-groups',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.create'),
    validate(createClientGroupSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({ success: true, data: await deps.manageClientGroups.create(req.body) });
    }),
  );
  router.patch(
    '/client-groups/:id',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.update'),
    validate(updateClientGroupSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageClientGroups.update(req.params.id, req.body) });
    }),
  );
  router.delete(
    '/client-groups/:id',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('client.update'),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageClientGroups.delete(req.params.id) });
    }),
  );
  router.get(
    '/currencies',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.view'),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.manageCurrencies.list(q.page, q.limit) });
    }),
  );
  router.post(
    '/currencies',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('currency.manage'),
    validate(createCurrencySchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({ success: true, data: await deps.manageCurrencies.create(req.body) });
    }),
  );
  router.patch(
    '/currencies/:id',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('currency.manage'),
    validate(updateCurrencySchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageCurrencies.update(req.params.id, req.body) });
    }),
  );
  router.patch(
    '/currencies/:id/deactivate',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('currency.manage'),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageCurrencies.deactivate(req.params.id) });
    }),
  );
  router.patch(
    '/currencies/:id/activate',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('currency.manage'),
    asyncRoute(async (req, res) => {
      const currency = await deps.manageCurrencies.activate(req.params.id);
      notifyAs(req.auth?.adminId, { type: 'CURRENCY', title: `إعادة تفعيل عملة: ${currency.name}`, message: `أُعيد تفعيل العملة «${currency.name}» (${currency.code}).` });
      res.json({ success: true, data: currency });
    }),
  );
  router.patch(
    '/currencies/:id/icon',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('currency.manage'),
    uploadCurrencyIcon,
    asyncRoute(async (req, res) => {
      if (!req.file) throw new ApplicationError('CURRENCY_ICON_REQUIRED', 'Currency icon is required', 422);
      const iconPath = `uploads/currencies/${req.file.filename}`;
      res.json({ success: true, data: await deps.manageCurrencies.update(req.params.id, { iconPath }) });
    }),
  );
  // حد الحركات (2026-09-22): بعد كل إضافة ناجحة تُقرأ حالة الترخيص من جديد فيصل القفل فوراً عند بلوغ الحد.
  router.use('/movements', (req, res, next) => {
    if (req.method === 'POST') res.on('finish', () => void (res.statusCode === 201 && deps.licenseMonitor.refresh()));
    next();
  });
  router.post(
    '/movements/transfers',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.create'),
    requireMovementQuota(deps.licenseMonitor),
    validate(createTransferSchema),
    asyncRoute(async (req, res) => {
      const result = await deps.createTransfer.execute({ ...req.body, createdBy: req.auth!.adminId });
      res.status(201).json({ success: true, data: result });
    }),
  );
  router.post(
    '/movements/settlements',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.create'),
    requireMovementQuota(deps.licenseMonitor),
    validate(createJournalMovementSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({
        success: true,
        data: await (async () => {
          const result = await deps.createJournalMovement.execute({
            ...req.body,
            movementCode: 'SETTLEMENT',
            createdBy: req.auth!.adminId,
          });
          return result;
        })(),
      });
    }),
  );
  router.post(
    '/movements/multi',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.create'),
    requireMovementQuota(deps.licenseMonitor),
    validate(createJournalMovementSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({
        success: true,
        data: await (async () => {
          const result = await deps.createJournalMovement.execute({
            ...req.body,
            movementCode: 'MULTI',
            createdBy: req.auth!.adminId,
          });
          return result;
        })(),
      });
    }),
  );
  router.post(
    '/movements/receipts',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.create'),
    requireMovementQuota(deps.licenseMonitor),
    validate(receiptPaymentSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({
        success: true,
        data: await (async () => {
          const result = await deps.createReceiptPayment.execute({
            ...req.body,
            type: ReceiptPaymentType.RECEIPT,
            createdBy: req.auth!.adminId,
          });
          return result;
        })(),
      });
    }),
  );
  router.post(
    '/movements/payments',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.create'),
    requireMovementQuota(deps.licenseMonitor),
    validate(receiptPaymentSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({
        success: true,
        data: await (async () => {
          const result = await deps.createReceiptPayment.execute({
            ...req.body,
            type: ReceiptPaymentType.PAYMENT,
            createdBy: req.auth!.adminId,
          });
          return result;
        })(),
      });
    }),
  );
  router.post(
    '/movements/exchanges',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.create'),
    requireMovementQuota(deps.licenseMonitor),
    validate(exchangeSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({
        success: true,
        data: await (async () => {
          const result = await deps.createExchange.execute({ ...req.body, createdBy: req.auth!.adminId });
          return result;
        })(),
      });
    }),
  );
  // ── تعديل الحركات في مكانها (نفس الرقم) — يحتاج صلاحيتَي الإنشاء والعكس ──
  const canEdit = [authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub), authorize('movement.create'), authorize('movement.reverse')];
  router.put(
    '/movements/transfers/:id',
    ...canEdit,
    validate(createTransferSchema),
    asyncRoute(async (req, res) => {
      const result = await deps.createTransfer.replace(req.params.id, { ...req.body, createdBy: req.auth!.adminId }, req.auth!.adminId);
      notifyAs(req.auth?.adminId, movementEdited('TRANSFER', result.movement, result.changes));
      res.json({ success: true, data: result });
    }),
  );
  router.put(
    '/movements/settlements/:id',
    ...canEdit,
    validate(createJournalMovementSchema),
    asyncRoute(async (req, res) => {
      const result = await deps.createJournalMovement.replace(
        req.params.id,
        { ...req.body, movementCode: 'SETTLEMENT', createdBy: req.auth!.adminId },
        req.auth!.adminId,
      );
      notifyAs(req.auth?.adminId, movementEdited('SETTLEMENT', result.movement, result.changes));
      res.json({ success: true, data: result });
    }),
  );
  router.put(
    '/movements/multi/:id',
    ...canEdit,
    validate(createJournalMovementSchema),
    asyncRoute(async (req, res) => {
      const result = await deps.createJournalMovement.replace(
        req.params.id,
        { ...req.body, movementCode: 'MULTI', createdBy: req.auth!.adminId },
        req.auth!.adminId,
      );
      notifyAs(req.auth?.adminId, movementEdited('MULTI', result.movement, result.changes));
      res.json({ success: true, data: result });
    }),
  );
  router.put(
    '/movements/receipts/:id',
    ...canEdit,
    validate(receiptPaymentSchema),
    asyncRoute(async (req, res) => {
      const result = await deps.createReceiptPayment.replace(
        req.params.id,
        { ...req.body, type: ReceiptPaymentType.RECEIPT, createdBy: req.auth!.adminId },
        req.auth!.adminId,
      );
      notifyAs(req.auth?.adminId, movementEdited('RECEIPT', result.movement, result.changes));
      res.json({ success: true, data: result });
    }),
  );
  router.put(
    '/movements/payments/:id',
    ...canEdit,
    validate(receiptPaymentSchema),
    asyncRoute(async (req, res) => {
      const result = await deps.createReceiptPayment.replace(
        req.params.id,
        { ...req.body, type: ReceiptPaymentType.PAYMENT, createdBy: req.auth!.adminId },
        req.auth!.adminId,
      );
      notifyAs(req.auth?.adminId, movementEdited('PAYMENT', result.movement, result.changes));
      res.json({ success: true, data: result });
    }),
  );
  router.put(
    '/movements/exchanges/:id',
    ...canEdit,
    validate(exchangeSchema),
    asyncRoute(async (req, res) => {
      const result = await deps.createExchange.replace(req.params.id, { ...req.body, createdBy: req.auth!.adminId }, req.auth!.adminId);
      notifyAs(req.auth?.adminId, movementEdited('EXCHANGE', result.movement, result.changes));
      res.json({ success: true, data: result });
    }),
  );
  router.get(
    '/journal',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('journal.view'),
    validateQuery(journalQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({
        success: true,
        data: await deps.getJournal.execute({
          dateFrom: q.date_from,
          dateTo: q.date_to,
          clientId: q.client_id,
          currencyId: q.currency_id,
          movementTypeId: q.movement_type_id,
          movementNo: q.movement_no,
          entrySide: q.entry_side,
          status: q.status,
          page: q.page,
          limit: q.limit,
        }),
      });
    }),
  );
  router.get(
    '/clients/:id/statement',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('journal.view'),
    validateQuery(statementQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({
        success: true,
        data: await deps.getClientStatement.execute({
          clientId: req.params.id,
          currencyId: q.currency_id,
          dateFrom: q.date_from,
          dateTo: q.date_to,
          movementTypeId: q.movement_type_id,
          // طيّ ما قبل التدوير في سطر واحد، و`scope=ROLLED_OVER` يفتح المطويّ للمراجعة (2026-09-23).
          collapseRollover: q.collapse_rollover === 'true',
          scope: q.scope,
          page: q.page,
          limit: q.limit,
        }),
      });
    }),
  );
  router.get(
    '/movements',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.view'),
    validateQuery(movementsQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({
        success: true,
        data: await deps.listMovements.execute({
          dateFrom: q.date_from,
          dateTo: q.date_to,
          movementTypeId: q.movement_type_id,
          clientId: q.client_id,
          currencyId: q.currency_id,
          status: q.status,
          movementNo: q.movement_no,
          createdBy: q.created_by,
          q: q.q,
          page: q.page,
          limit: q.limit,
        }),
      });
    }),
  );
  router.get(
    '/clients/:id/balances',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('journal.view'),
    validateQuery(balancesQuerySchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.getClientBalances.execute(req.params.id, req.validatedQuery.as_of) });
    }),
  );
  router.get(
    '/reports/balance-sheet',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('journal.view'),
    validateQuery(balanceSheetQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({
        success: true,
        data: await deps.getBalanceSheet.execute({
          asOf: q.as_of,
          currencyId: q.currency_id,
          mode: q.mode,
          detail: q.detail,
          clientQuery: q.q,
          includeSecret: req.auth!.role === 'ADMIN',
        }),
      });
    }),
  );
  router.get(
    '/dashboard',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('journal.view'),
    asyncRoute(async (_req, res) => {
      res.json({ success: true, data: await deps.getDashboard.execute() });
    }),
  );
  router.get(
    '/movements/:id',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.view'),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.getMovementDetails.execute(req.params.id) });
    }),
  );
  router.post(
    '/movements/:id/cancel',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.cancel'),
    asyncRoute(async (req, res) => {
      const movement = await deps.cancelMovement.execute(req.params.id, req.auth!.adminId);
      notifyAs(req.auth?.adminId, {
        type: 'ALERT',
        movementId: movement.id,
        title: `إلغاء حركة #${movement.movementNo}`,
        message: `تم إلغاء الحركة رقم ${movement.movementNo}.`,
      });
      res.json({ success: true, data: movement });
    }),
  );
  router.post(
    '/movements/:id/reverse',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('movement.reverse'),
    asyncRoute(async (req, res) => {
      const result = await deps.reverseMovement.execute(req.params.id, req.auth!.adminId);
      notifyAs(req.auth?.adminId, {
        type: 'ALERT',
        movementId: result.movement.id,
        title: `${result.reversed ? 'عكس' : 'إعادة'} حركة #${result.movement.movementNo}`,
        message: result.reversed
          ? `تم عكس الحركة رقم ${result.movement.movementNo} في مكانها (قُلبت أطرافها). المحصلة: ${trimAmount(result.movement.totalResult)} $`
          : `أُعيدت الحركة رقم ${result.movement.movementNo} إلى اتجاهها الأصلي. المحصلة: ${trimAmount(result.movement.totalResult)} $`,
      });
      res.json({ success: true, data: result });
    }),
  );
  router.get(
    '/notifications',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.getNotifications.execute(req.auth!.adminId, q.page, q.limit) });
    }),
  );
  router.get(
    '/notifications/unread-count',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.getNotifications.unreadCount(req.auth!.adminId) });
    }),
  );
  // بثّ فوري (SSE): كل إشعار جديد للإداري الحالي يصل لحظة إنشائه؛ نبضة كل 20 ث تبقي الاتصال حياً.
  router.get('/notifications/stream', authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub), (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    // أحادية الجلسة: هذا البثّ هو «الحضور» — يحجز الحساب لهذا الجهاز حتى يُغلق التطبيق.
    const release = deps.notificationHub.claim(req.auth!.adminId, req.auth!.deviceId);
    send('ready', { adminId: req.auth!.adminId });
    deps.logger.info({ adminId: req.auth!.adminId }, 'notifications stream opened');
    const unsubscribe = deps.notificationHub.subscribe(req.auth!.adminId, (n) => send('notification', n));
    // حالة ترخيص المكتب: الحالية فور الاتصال (لإعادة الاتصال بعد انقطاع) ثم كل تغيّر لحظة حدوثه.
    const officeId = req.auth!.officeId;
    void deps.licenseMonitor.current(officeId).then((state) => send('license', state));
    const unsubscribeLicense = deps.notificationHub.subscribeLicense(officeId, (state) => send('license', state));
    // حالة الحساب: تعطيل/تفعيل الإداري نفسه يصل لحظة حدوثه.
    const unsubscribeAccount = deps.notificationHub.subscribeAccount(req.auth!.adminId, (state) => send('account', state));
    // معلومات المكتب (اللوغو من اللوحة…): الحالية عند الاتصال ثم كل تغيير لحظته.
    void deps.offices.findById(officeId).then((office) => office && send('office', officePublicInfo(office)));
    const unsubscribeOffice = deps.notificationHub.subscribeOffice(officeId, (info) => send('office', info));
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 20_000);
    req.on('close', () => {
      clearInterval(heartbeat);
      release();
      unsubscribe();
      unsubscribeLicense();
      unsubscribeAccount();
      unsubscribeOffice();
      deps.logger.info({ adminId: req.auth!.adminId }, 'notifications stream closed');
    });
  });
  router.patch(
    '/notifications/read-all',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.getNotifications.markAllRead(req.auth!.adminId) });
    }),
  );
  router.patch(
    '/notifications/:id/read',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.markNotificationRead.execute(req.params.id, req.auth!.adminId) });
    }),
  );
  router.post(
    '/system/reset-data',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    authorize('admin.manage'),
    validate(resetDataSchema),
    asyncRoute(async (req, res) => {
      const summary = await deps.resetSystemData.execute(req.auth!.adminId, req.body.password, req.body.confirmation);
      notifyAs(req.auth?.adminId, {
        type: 'SYSTEM',
        title: 'تصفير البيانات',
        message: 'تم تصفير كل البيانات التجارية (الحركات، القيود، العملاء، المجموعات).',
      });
      res.json({ success: true, data: summary });
    }),
  );
  router.patch(
    '/auth/me/password',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    validate(changePasswordSchema),
    asyncRoute(async (req, res) => {
      const result = await deps.changeOwnPassword.execute(req.auth!.adminId, req.body.currentPassword, req.body.newPassword);
      notifyAs(req.auth?.adminId, {
        type: 'ADMIN',
        title: 'تغيير كلمة المرور',
        message: 'تم تغيير كلمة مرور الحساب بنجاح.',
      });
      res.json({ success: true, data: result });
    }),
  );
  // الحساب الحالي — تستعمله شاشة القفل لتعرف متى أُعيد التفعيل (معطَّل ⇒ 403 ADMIN_DEACTIVATED من المصادقة).
  router.get(
    '/auth/me',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    asyncRoute(async (req, res) => {
      const admin = await deps.admins.findById(req.auth!.adminId);
      if (!admin) throw new ApplicationError('ADMIN_NOT_FOUND', 'Admin not found', 404);
      const { passwordHash: _hash, ...safe } = admin;
      res.json({ success: true, data: { admin: safe, office: { id: req.auth!.officeId, code: req.auth!.officeCode } } });
    }),
  );
  router.delete(
    '/auth/me',
    authenticate(deps.tokens, deps.licenseMonitor, deps.tenantScope, deps.admins, deps.notificationHub),
    validate(deleteOwnAccountSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.deleteOwnAccount.execute(req.auth!.adminId, req.body.password) });
    }),
  );
  return router;
}
