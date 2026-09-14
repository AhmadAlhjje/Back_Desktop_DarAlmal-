import { Router, type RequestHandler } from 'express';
import type { Login } from '../../application/use-cases/auth/Login.js';
import type { CreateClient } from '../../application/use-cases/clients/CreateClient.js';
import type { CreateTransfer } from '../../application/use-cases/movements/CreateTransfer.js';
import type { CreateJournalMovement } from '../../application/use-cases/movements/CreateJournalMovement.js';
import type { TokenService } from '../../application/ports/services/TokenService.js';
import { validate, validateQuery } from './middleware/validate.js';
import { authenticate, authorize } from './middleware/authenticate.js';
import { loginSchema } from './validators/authSchemas.js';
import { createClientSchema } from './validators/clientSchemas.js';
import { createTransferSchema } from './validators/transferSchemas.js';
import { createJournalMovementSchema } from './validators/journalMovementSchemas.js';
import type { CreateReceiptPayment } from '../../application/use-cases/movements/CreateReceiptPayment.js';
import type { CreateExchange } from '../../application/use-cases/movements/CreateExchange.js';
import { ReceiptPaymentType } from '../../domain/enums/ReceiptPaymentType.js';
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
import type { ResetSystemData } from '../../application/use-cases/system/ResetSystemData.js';
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
/** عرض المبلغ بلا أصفار زائدة (5.0000 → 5، 12.50 → 12.5). */
const trimAmount = (value: string): string => (value.includes('.') ? value.replace(/\.?0+$/, '') : value) || '0';
const movementCreated = (kind: string, m: Movement, description?: string | null): NotificationEvent => ({
  type: 'MOVEMENT',
  movementId: m.id,
  title: `${MOVEMENT_LABELS[kind] ?? kind} جديدة #${m.movementNo}`,
  message: `تم إنشاء ${MOVEMENT_LABELS[kind] ?? kind} رقم ${m.movementNo}${description ? ` — ${description}` : ''}. المحصلة: ${trimAmount(m.totalResult)} $`,
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
  resetSystemData: ResetSystemData;
  deleteOwnAccount: DeleteOwnAccount;
  tokens: TokenService;
}) {
  const router = Router();
  const notifyAs = (actorId: string | undefined, event: NotificationEvent) =>
    void deps.notifyAdmins.execute({ ...event, actorId: actorId ?? null });
  router.post(
    '/auth/login',
    validate(loginSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.login.execute(req.body.fullName, req.body.password) });
    }),
  );
  router.get(
    '/admins',
    authenticate(deps.tokens),
    authorize('admin.manage'),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.manageAdmins.list(q.page, q.limit) });
    }),
  );
  router.post(
    '/admins',
    authenticate(deps.tokens),
    authorize('admin.manage'),
    validate(createAdminSchema),
    asyncRoute(async (req, res) => {
      const admin = await deps.manageAdmins.create(req.body);
      notifyAs(req.auth?.adminId, { type: 'ADMIN', title: 'إداري جديد', message: `تمت إضافة الإداري «${admin.fullName}» بدور ${admin.role}.` });
      res.status(201).json({ success: true, data: admin });
    }),
  );
  router.patch(
    '/admins/:id',
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
    authorize('admin.manage'),
    asyncRoute(async (req, res) => {
      const admin = await deps.manageAdmins.activate(req.params.id);
      notifyAs(req.auth?.adminId, { type: 'ADMIN', title: 'إعادة تفعيل إداري', message: `أُعيد تفعيل حساب الإداري «${admin.fullName}».` });
      res.json({ success: true, data: admin });
    }),
  );
  router.patch(
    '/admins/:id/deactivate',
    authenticate(deps.tokens),
    authorize('admin.manage'),
    asyncRoute(async (req, res) => {
      const admin = await deps.manageAdmins.deactivate(req.params.id, req.auth!.adminId);
      notifyAs(req.auth?.adminId, { type: 'ADMIN', title: 'تعطيل إداري', message: `تم تعطيل حساب الإداري «${admin.fullName}».` });
      res.json({ success: true, data: admin });
    }),
  );
  router.get(
    '/movement-types',
    authenticate(deps.tokens),
    authorize('movement.view'),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.manageMovementTypes.list(q.page, q.limit) });
    }),
  );
  router.patch(
    '/movement-types/:id',
    authenticate(deps.tokens),
    authorize('admin.manage'),
    validate(updateMovementTypeSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageMovementTypes.update(req.params.id, req.body) });
    }),
  );
  router.post(
    '/clients',
    authenticate(deps.tokens),
    authorize('client.create'),
    validate(createClientSchema),
    asyncRoute(async (req, res) => {
      const client = await deps.createClient.execute(req.body);
      notifyAs(req.auth?.adminId, {
        type: 'CLIENT',
        title: client.accountType === 'BOX' ? `صندوق جديد: ${client.fullName}` : `عميل جديد: ${client.fullName}`,
        message: `تم تسجيل الحساب «${client.fullName}» (${client.code}).`,
      });
      res.status(201).json({ success: true, data: client });
    }),
  );
  router.get(
    '/clients',
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
    authorize('movement.view'),
    asyncRoute(async (_req, res) => {
      res.json({ success: true, data: await deps.manageClients.cashBox() });
    }),
  );
  router.patch(
    '/clients/:id',
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
    authorize('client.update'),
    validate(secretClientSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageClients.setSecret(req.params.id, req.body.isSecret) });
    }),
  );
  router.patch(
    '/clients/:id/rollover',
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
    authorize('client.update'),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageClients.delete(req.params.id) });
    }),
  );
  router.get(
    '/client-groups',
    authenticate(deps.tokens),
    authorize('movement.view'),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.manageClientGroups.list(q.page, q.limit) });
    }),
  );
  router.post(
    '/client-groups',
    authenticate(deps.tokens),
    authorize('client.create'),
    validate(createClientGroupSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({ success: true, data: await deps.manageClientGroups.create(req.body) });
    }),
  );
  router.patch(
    '/client-groups/:id',
    authenticate(deps.tokens),
    authorize('client.update'),
    validate(updateClientGroupSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageClientGroups.update(req.params.id, req.body) });
    }),
  );
  router.delete(
    '/client-groups/:id',
    authenticate(deps.tokens),
    authorize('client.update'),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageClientGroups.delete(req.params.id) });
    }),
  );
  router.get(
    '/currencies',
    authenticate(deps.tokens),
    authorize('movement.view'),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.manageCurrencies.list(q.page, q.limit) });
    }),
  );
  router.post(
    '/currencies',
    authenticate(deps.tokens),
    authorize('currency.manage'),
    validate(createCurrencySchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({ success: true, data: await deps.manageCurrencies.create(req.body) });
    }),
  );
  router.patch(
    '/currencies/:id',
    authenticate(deps.tokens),
    authorize('currency.manage'),
    validate(updateCurrencySchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageCurrencies.update(req.params.id, req.body) });
    }),
  );
  router.patch(
    '/currencies/:id/deactivate',
    authenticate(deps.tokens),
    authorize('currency.manage'),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageCurrencies.deactivate(req.params.id) });
    }),
  );
  router.patch(
    '/currencies/:id/activate',
    authenticate(deps.tokens),
    authorize('currency.manage'),
    asyncRoute(async (req, res) => {
      const currency = await deps.manageCurrencies.activate(req.params.id);
      notifyAs(req.auth?.adminId, { type: 'CURRENCY', title: `إعادة تفعيل عملة: ${currency.name}`, message: `أُعيد تفعيل العملة «${currency.name}» (${currency.code}).` });
      res.json({ success: true, data: currency });
    }),
  );
  router.patch(
    '/currencies/:id/icon',
    authenticate(deps.tokens),
    authorize('currency.manage'),
    uploadCurrencyIcon,
    asyncRoute(async (req, res) => {
      if (!req.file) throw new ApplicationError('CURRENCY_ICON_REQUIRED', 'Currency icon is required', 422);
      const iconPath = `uploads/currencies/${req.file.filename}`;
      res.json({ success: true, data: await deps.manageCurrencies.update(req.params.id, { iconPath }) });
    }),
  );
  router.post(
    '/movements/transfers',
    authenticate(deps.tokens),
    authorize('movement.create'),
    validate(createTransferSchema),
    asyncRoute(async (req, res) => {
      const result = await deps.createTransfer.execute({ ...req.body, createdBy: req.auth!.adminId });
      notifyAs(req.auth?.adminId, movementCreated('TRANSFER', result.movement, req.body.statement));
      res.status(201).json({ success: true, data: result });
    }),
  );
  router.post(
    '/movements/settlements',
    authenticate(deps.tokens),
    authorize('movement.create'),
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
          notifyAs(req.auth?.adminId, movementCreated('SETTLEMENT', result, req.body.description));
          return result;
        })(),
      });
    }),
  );
  router.post(
    '/movements/multi',
    authenticate(deps.tokens),
    authorize('movement.create'),
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
          notifyAs(req.auth?.adminId, movementCreated('MULTI', result, req.body.description));
          return result;
        })(),
      });
    }),
  );
  router.post(
    '/movements/receipts',
    authenticate(deps.tokens),
    authorize('movement.create'),
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
          notifyAs(req.auth?.adminId, movementCreated('RECEIPT', result.movement, req.body.statement));
          return result;
        })(),
      });
    }),
  );
  router.post(
    '/movements/payments',
    authenticate(deps.tokens),
    authorize('movement.create'),
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
          notifyAs(req.auth?.adminId, movementCreated('PAYMENT', result.movement, req.body.statement));
          return result;
        })(),
      });
    }),
  );
  router.post(
    '/movements/exchanges',
    authenticate(deps.tokens),
    authorize('movement.create'),
    validate(exchangeSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({
        success: true,
        data: await (async () => {
          const result = await deps.createExchange.execute({ ...req.body, createdBy: req.auth!.adminId });
          notifyAs(req.auth?.adminId, movementCreated('EXCHANGE', result.movement, req.body.statement));
          return result;
        })(),
      });
    }),
  );
  router.get(
    '/journal',
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
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
          page: q.page,
          limit: q.limit,
        }),
      });
    }),
  );
  router.get(
    '/movements',
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
    authorize('journal.view'),
    validateQuery(balancesQuerySchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.getClientBalances.execute(req.params.id, req.validatedQuery.as_of) });
    }),
  );
  router.get(
    '/reports/balance-sheet',
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
    authorize('journal.view'),
    asyncRoute(async (_req, res) => {
      res.json({ success: true, data: await deps.getDashboard.execute() });
    }),
  );
  router.get(
    '/movements/:id',
    authenticate(deps.tokens),
    authorize('movement.view'),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.getMovementDetails.execute(req.params.id) });
    }),
  );
  router.post(
    '/movements/:id/cancel',
    authenticate(deps.tokens),
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
    authenticate(deps.tokens),
    authorize('movement.reverse'),
    asyncRoute(async (req, res) => {
      const result = await deps.reverseMovement.execute(req.params.id, req.auth!.adminId);
      notifyAs(req.auth?.adminId, {
        type: 'ALERT',
        movementId: result.reverseMovement.id,
        title: `عكس حركة #${result.reverseMovement.movementNo}`,
        message: `تم إنشاء حركة عكسية رقم ${result.reverseMovement.movementNo} للحركة الأصلية.`,
      });
      res.status(201).json({ success: true, data: result });
    }),
  );
  router.get(
    '/notifications',
    authenticate(deps.tokens),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.getNotifications.execute(req.auth!.adminId, q.page, q.limit) });
    }),
  );
  router.get(
    '/notifications/unread-count',
    authenticate(deps.tokens),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.getNotifications.unreadCount(req.auth!.adminId) });
    }),
  );
  router.patch(
    '/notifications/read-all',
    authenticate(deps.tokens),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.getNotifications.markAllRead(req.auth!.adminId) });
    }),
  );
  router.patch(
    '/notifications/:id/read',
    authenticate(deps.tokens),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.markNotificationRead.execute(req.params.id, req.auth!.adminId) });
    }),
  );
  router.post(
    '/system/reset-data',
    authenticate(deps.tokens),
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
  router.delete(
    '/auth/me',
    authenticate(deps.tokens),
    validate(deleteOwnAccountSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.deleteOwnAccount.execute(req.auth!.adminId, req.body.password) });
    }),
  );
  return router;
}
