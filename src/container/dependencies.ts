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
const logger = new PinoLogger(env.LOG_LEVEL);
const repositories = createRepositories(undefined, logger);
const hasher = new BcryptPasswordHasher(env.BCRYPT_ROUNDS);
export const tokens = new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN as never);
const uow = new SequelizeUnitOfWork(sequelize, logger);
const clock = new SystemClock();
export const dependencies = {
  logger,
  tokens,
  login: new Login(repositories.adminRepository, hasher, tokens),
  manageAdmins: new ManageAdmins(repositories.adminRepository, hasher),
  manageMovementTypes: new ManageMovementTypes(repositories.movementTypeRepository),
  createClient: new CreateClient(repositories.clientRepository, repositories.clientGroupRepository),
  manageClients: new ManageClients(repositories.clientRepository, repositories.clientGroupRepository),
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
  cancelMovement: new CancelMovement(uow),
  reverseMovement: new ReverseMovement(uow, clock),
  getNotifications: new GetNotifications(repositories.notificationRepository),
  markNotificationRead: new MarkNotificationRead(repositories.notificationRepository),
};
