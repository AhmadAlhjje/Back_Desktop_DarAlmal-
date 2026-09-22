import { sequelize } from '../infrastructure/database/sequelize/sequelize.js';
import { createRepositories } from '../infrastructure/database/sequelize/repositories/SequelizeRepositories.js';
import { SequelizeUnitOfWork } from '../infrastructure/database/sequelize/SequelizeUnitOfWork.js';
import { BcryptPasswordHasher } from '../infrastructure/security/BcryptPasswordHasher.js';
import { JwtTokenService } from '../infrastructure/security/JwtTokenService.js';
import { SystemClock } from '../infrastructure/time/SystemClock.js';
import { Login } from '../application/use-cases/auth/Login.js';
import { CreateClient } from '../application/use-cases/clients/CreateClient.js';
import { CreateTransfer } from '../application/use-cases/movements/CreateTransfer.js';
import { env } from '../config/env.js';
import { CreateJournalMovement } from '../application/use-cases/movements/CreateJournalMovement.js';
import { CreateReceiptPayment } from '../application/use-cases/movements/CreateReceiptPayment.js';
import { CreateExchange } from '../application/use-cases/movements/CreateExchange.js';
import { GetJournal } from '../application/use-cases/journal/GetJournal.js';
import { GetClientStatement } from '../application/use-cases/journal/GetClientStatement.js';
import { GetMovementDetails } from '../application/use-cases/movements/GetMovementDetails.js';
import { ListMovements } from '../application/use-cases/movements/ListMovements.js';
import { GetClientBalances } from '../application/use-cases/reports/GetClientBalances.js';
import { GetBalanceSheet } from '../application/use-cases/reports/GetBalanceSheet.js';
import { GetDashboard } from '../application/use-cases/reports/GetDashboard.js';
import { SequelizeReportsRepository } from '../infrastructure/database/sequelize/repositories/SequelizeReportsRepository.js';
import { CancelMovement } from '../application/use-cases/movements/CancelMovement.js';
import { ReverseMovement } from '../application/use-cases/movements/ReverseMovement.js';
import { GetNotifications } from '../application/use-cases/notifications/GetNotifications.js';
import { MarkNotificationRead } from '../application/use-cases/notifications/MarkNotificationRead.js';
import { ManageClients } from '../application/use-cases/clients/ManageClients.js';
import { ManageClientGroups } from '../application/use-cases/client-groups/ManageClientGroups.js';
import { ManageCurrencies } from '../application/use-cases/currencies/ManageCurrencies.js';
import { ManageAdmins } from '../application/use-cases/admins/ManageAdmins.js';
import { ManageMovementTypes } from '../application/use-cases/movement-types/ManageMovementTypes.js';
import { PinoLogger } from '../infrastructure/logging/PinoLogger.js';
import { NotifyAdmins } from '../application/use-cases/notifications/NotifyAdmins.js';
import { ResetSystemData } from '../application/use-cases/system/ResetSystemData.js';
import { ChangeOwnPassword } from '../application/use-cases/admins/ChangeOwnPassword.js';
import { DeleteOwnAccount } from '../application/use-cases/admins/DeleteOwnAccount.js';
import { NotificationHub } from '../infrastructure/realtime/NotificationHub.js';
import { LicenseMonitor } from '../application/use-cases/license/LicenseMonitor.js';
import { SequelizeOfficeRepository } from '../infrastructure/database/sequelize/repositories/SequelizeOfficeRepository.js';
import { SequelizePlatformStatsRepository } from '../infrastructure/database/sequelize/repositories/SequelizePlatformStatsRepository.js';
import { tenantScope } from '../infrastructure/tenancy/TenantContext.js';
import { SequelizeOfficeDeviceRepository } from '../infrastructure/database/sequelize/repositories/SequelizeOfficeDeviceRepository.js';
import { SequelizePlatformNoticeRepository } from '../infrastructure/database/sequelize/repositories/SequelizePlatformNoticeRepository.js';
import { SystemNotice } from '../application/use-cases/platform/SystemNotice.js';
import { ManageOffices } from '../application/use-cases/platform/ManageOffices.js';
import { ManageOfficeAdmins } from '../application/use-cases/platform/ManageOfficeAdmins.js';
const logger = new PinoLogger(env.LOG_LEVEL);
const repositories = createRepositories(undefined, logger);
const hasher = new BcryptPasswordHasher(env.BCRYPT_ROUNDS);
export const tokens = new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN as never);
const uow = new SequelizeUnitOfWork(sequelize, logger);
const clock = new SystemClock();
const reportsRepository = new SequelizeReportsRepository(sequelize);
const notificationHub = new NotificationHub();
// الترخيص: يُقرأ من قاعدة المكتب ويُدفع تغيّره إلى كل المتصلين عبر SSE.
const offices = new SequelizeOfficeRepository();
const officeDevices = new SequelizeOfficeDeviceRepository();
const platformStats = new SequelizePlatformStatsRepository();
// إعلان المنصّة: يُقرأ عند الإقلاع وتسجيل الدخول فقط (لا يقفل جلسة جارية) — قرار المستخدم 2026-09-23.
const systemNotice = new SystemNotice(new SequelizePlatformNoticeRepository(), 5_000, logger);
const licenseMonitor = new LicenseMonitor(offices, clock, logger, {
  cacheMs: 5_000,
  pollMs: env.LICENSE_POLL_SECONDS * 1_000,
});
licenseMonitor.subscribe((officeId, state) => notificationHub.publishLicense(officeId, state));
export const dependencies = {
  logger,
  tokens,
  login: new Login(offices, repositories.adminRepository, hasher, tokens, licenseMonitor, tenantScope, officeDevices, notificationHub, systemNotice),
  manageAdmins: new ManageAdmins(repositories.adminRepository, hasher),
  manageMovementTypes: new ManageMovementTypes(repositories.movementTypeRepository),
  createClient: new CreateClient(repositories.clientRepository, repositories.clientGroupRepository),
  manageClients: new ManageClients(repositories.clientRepository, repositories.clientGroupRepository, reportsRepository),
  manageClientGroups: new ManageClientGroups(repositories.clientGroupRepository),
  manageCurrencies: new ManageCurrencies(repositories.currencyRepository),
  createTransfer: new CreateTransfer(uow, clock),
  createJournalMovement: new CreateJournalMovement(uow, clock),
  createReceiptPayment: new CreateReceiptPayment(uow, clock),
  createExchange: new CreateExchange(uow, clock),
  getJournal: new GetJournal(repositories.journalRepository),
  getClientStatement: new GetClientStatement(
    repositories.journalRepository,
    repositories.clientRepository,
    repositories.currencyRepository,
  ),
  getMovementDetails: new GetMovementDetails(repositories.movementRepository),
  listMovements: new ListMovements(repositories.movementRepository),
  getClientBalances: new GetClientBalances(reportsRepository, repositories.clientRepository),
  getBalanceSheet: new GetBalanceSheet(reportsRepository),
  getDashboard: new GetDashboard(reportsRepository, repositories.movementRepository, clock, undefined, offices, tenantScope),
  cancelMovement: new CancelMovement(uow),
  reverseMovement: new ReverseMovement(uow, clock),
  getNotifications: new GetNotifications(repositories.notificationRepository),
  markNotificationRead: new MarkNotificationRead(repositories.notificationRepository),
  notifyAdmins: new NotifyAdmins(repositories.adminRepository, repositories.notificationRepository, logger, notificationHub),
  notificationHub,
  licenseMonitor,
  tenantScope,
  offices,
  admins: repositories.adminRepository,
  officeDevices,
  platformStats,
  systemNotice,
  platformApiKey: env.PLATFORM_API_KEY,
  manageOffices: new ManageOffices(offices, platformStats, uow, tenantScope, hasher),
  manageOfficeAdmins: new ManageOfficeAdmins(offices, repositories.adminRepository, hasher, tenantScope),
  resetSystemData: new ResetSystemData(uow, repositories.adminRepository, hasher),
  deleteOwnAccount: new DeleteOwnAccount(repositories.adminRepository, hasher),
  changeOwnPassword: new ChangeOwnPassword(repositories.adminRepository, hasher),
};
