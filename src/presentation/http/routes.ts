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
import { journalQuerySchema, statementQuerySchema } from './validators/querySchemas.js';
import type { GetMovementDetails } from '../../application/use-cases/movements/GetMovementDetails.js';
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
  cancelMovement: CancelMovement;
  reverseMovement: ReverseMovement;
  getNotifications: GetNotifications;
  markNotificationRead: MarkNotificationRead;
  tokens: TokenService;
}) {
  const router = Router();
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
      res.status(201).json({ success: true, data: await deps.manageAdmins.create(req.body) });
    }),
  );
  router.patch(
    '/admins/:id',
    authenticate(deps.tokens),
    authorize('admin.manage'),
    validate(updateAdminSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageAdmins.update(req.params.id, req.body) });
    }),
  );
  router.patch(
    '/admins/:id/deactivate',
    authenticate(deps.tokens),
    authorize('admin.manage'),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageAdmins.deactivate(req.params.id, req.auth!.adminId) });
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
      res.status(201).json({ success: true, data: await deps.createClient.execute(req.body) });
    }),
  );
  router.get(
    '/clients',
    authenticate(deps.tokens),
    authorize('movement.view'),
    validateQuery(paginationQuerySchema),
    asyncRoute(async (req, res) => {
      const q = req.validatedQuery;
      res.json({ success: true, data: await deps.manageClients.list(q.page, q.limit) });
    }),
  );
  router.patch(
    '/clients/:id',
    authenticate(deps.tokens),
    authorize('client.update'),
    validate(updateClientSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageClients.update(req.params.id, req.body) });
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
      res.status(201).json({
        success: true,
        data: await deps.createTransfer.execute({ ...req.body, createdBy: req.auth!.adminId }),
      });
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
        data: await deps.createJournalMovement.execute({
          ...req.body,
          movementCode: 'SETTLEMENT',
          createdBy: req.auth!.adminId,
        }),
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
        data: await deps.createJournalMovement.execute({
          ...req.body,
          movementCode: 'MULTI',
          createdBy: req.auth!.adminId,
        }),
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
        data: await deps.createReceiptPayment.execute({
          ...req.body,
          type: ReceiptPaymentType.RECEIPT,
          createdBy: req.auth!.adminId,
        }),
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
        data: await deps.createReceiptPayment.execute({
          ...req.body,
          type: ReceiptPaymentType.PAYMENT,
          createdBy: req.auth!.adminId,
        }),
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
        data: await deps.createExchange.execute({ ...req.body, createdBy: req.auth!.adminId }),
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
      res.json({ success: true, data: await deps.cancelMovement.execute(req.params.id, req.auth!.adminId) });
    }),
  );
  router.post(
    '/movements/:id/reverse',
    authenticate(deps.tokens),
    authorize('movement.reverse'),
    asyncRoute(async (req, res) => {
      res
        .status(201)
        .json({ success: true, data: await deps.reverseMovement.execute(req.params.id, req.auth!.adminId) });
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
  router.patch(
    '/notifications/:id/read',
    authenticate(deps.tokens),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.markNotificationRead.execute(req.params.id, req.auth!.adminId) });
    }),
  );
  return router;
}
