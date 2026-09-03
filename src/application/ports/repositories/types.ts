import type {
  Admin,
  Client,
  ClientGroup,
  Currency,
  Exchange,
  JournalEntry,
  Movement,
  MovementType,
  Notification,
  ReceiptPayment,
  Transfer,
} from '../../../domain/entities/types.js';

export interface AdminRepository {
  findById(id: string): Promise<Admin | null>;
  findByFullName(fullName: string): Promise<Admin | null>;
  findPage(page: number, limit: number): Promise<Page<Admin>>;
  create(input: Omit<Admin, 'id'>): Promise<Admin>;
  update(id: string, input: Partial<Omit<Admin, 'id'>>): Promise<Admin | null>;
}
export interface Page<T> {
  rows: T[];
  count: number;
}
export interface ClientGroupRepository {
  findById(id: string): Promise<ClientGroup | null>;
  findPage(page: number, limit: number): Promise<Page<ClientGroup>>;
  create(input: Omit<ClientGroup, 'id'>): Promise<ClientGroup>;
  update(id: string, input: Partial<Omit<ClientGroup, 'id'>>): Promise<ClientGroup | null>;
}
export interface ClientRepository {
  findById(id: string): Promise<Client | null>;
  findPage(page: number, limit: number): Promise<Page<Client>>;
  create(input: Omit<Client, 'id'>): Promise<Client>;
  update(id: string, input: Partial<Omit<Client, 'id'>>): Promise<Client | null>;
}
export interface CurrencyRepository {
  findById(id: string): Promise<Currency | null>;
  findPage(page: number, limit: number): Promise<Page<Currency>>;
  create(input: Omit<Currency, 'id'>): Promise<Currency>;
  update(id: string, input: Partial<Omit<Currency, 'id'>>): Promise<Currency | null>;
}
export interface MovementTypeRepository {
  findByCode(code: string): Promise<MovementType | null>;
  findPage(page: number, limit: number): Promise<Page<MovementType>>;
  update(
    id: string,
    input: Partial<Pick<MovementType, 'name' | 'description' | 'isActive'>>,
  ): Promise<MovementType | null>;
}
export interface MovementDetails {
  movement: Movement;
  movementType: MovementType;
  createdBy: Omit<Admin, 'passwordHash'>;
  updatedBy: Omit<Admin, 'passwordHash'> | null;
  detail: Record<string, unknown> | null;
  journalEntries: JournalEntry[];
}
export interface MovementRepository {
  create(input: Omit<Movement, 'id'> & { id?: string }): Promise<Movement>;
  findById(id: string): Promise<Movement | null>;
  findDetails(id: string): Promise<MovementDetails | null>;
  updateResult(id: string, result: string): Promise<void>;
  updateStatus(id: string, status: Movement['status'], updatedBy: string): Promise<void>;
}
export interface JournalFilters {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  currencyId?: string;
  movementTypeId?: string;
  movementNo?: string;
  entrySide?: 'US' | 'THEM';
  status?: string;
  page: number;
  limit: number;
}
export interface JournalItem extends JournalEntry {
  id: string;
  movementNo: string;
  movementTypeId: string;
  movementTypeCode: string;
  movementStatus: string;
}
export interface SideTotals {
  us: string;
  them: string;
}
export interface JournalPage {
  rows: JournalItem[];
  count: number;
}
export interface StatementPage extends JournalPage {
  opening: SideTotals;
  beforePage: SideTotals;
  period: SideTotals;
}
export interface JournalRepository {
  createMany(entries: JournalEntry[]): Promise<void>;
  findByMovement(movementId: string): Promise<JournalEntry[]>;
  findPage(filters: JournalFilters): Promise<JournalPage>;
  findStatementPage(filters: JournalFilters & { clientId: string; currencyId: string }): Promise<StatementPage>;
}
export interface TransferRepository {
  create(input: Transfer): Promise<Transfer>;
}
export interface ExchangeRepository {
  create(input: Exchange): Promise<Exchange>;
}
export interface ReceiptPaymentRepository {
  create(input: ReceiptPayment): Promise<ReceiptPayment>;
}
export interface NotificationRepository {
  create(input: Omit<Notification, 'id'>): Promise<Notification>;
  findPage(adminId: string, page: number, limit: number): Promise<{ rows: Notification[]; count: number }>;
  markRead(id: string, adminId: string): Promise<boolean>;
}
export interface Repositories {
  adminRepository: AdminRepository;
  clientGroupRepository: ClientGroupRepository;
  clientRepository: ClientRepository;
  currencyRepository: CurrencyRepository;
  movementTypeRepository: MovementTypeRepository;
  movementRepository: MovementRepository;
  journalRepository: JournalRepository;
  transferRepository: TransferRepository;
  exchangeRepository: ExchangeRepository;
  receiptPaymentRepository: ReceiptPaymentRepository;
  notificationRepository: NotificationRepository;
}
