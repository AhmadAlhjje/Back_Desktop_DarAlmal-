import type { ReceiptPaymentType } from '../../../domain/enums/ReceiptPaymentType.js';
import type { OfficeRepository } from './OfficeRepository.js';
import type { PlatformStatsRepository } from './PlatformStatsRepository.js';
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
  ClientInput,
} from '../../../domain/entities/types.js';

export interface AdminRepository {
  findById(id: string): Promise<Admin | null>;
  findByFullName(fullName: string): Promise<Admin | null>;
  findPage(page: number, limit: number): Promise<Page<Admin>>;
  /** كل الإداريين النشطين (لتوزيع الإشعارات). */
  findAllActive(): Promise<Admin[]>;
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
  /** عدد العملاء المرتبطين بالمجموعة (لمنع الحذف عند الاستخدام). */
  countClients(id: string): Promise<number>;
  /** حذف مجموعة غير مستخدمة. يعيد false إن لم تكن موجودة. */
  delete(id: string): Promise<boolean>;
}
export interface ClientListFilters {
  /** true = المؤرشفون فقط، false/undefined = النشطون فقط. */
  archived?: boolean;
  /** إظهار الحسابات السرّية (دور ADMIN فقط). */
  includeSecret?: boolean;
}
export interface ClientRepository {
  findById(id: string): Promise<Client | null>;
  findPage(page: number, limit: number, filters?: ClientListFilters): Promise<Page<Client>>;
  findCashBox(): Promise<Client | null>;
  create(input: ClientInput): Promise<Client>;
  /** حساب نظامي مبذور عند إنشاء المكتب (SYS-CASH / SYS-PNL): لا يُحذف ولا يُؤرشف. */
  createSystemAccount(input: { code: string; fullName: string; importance: number; isCashBox: boolean }): Promise<Client>;
  update(id: string, input: Partial<ClientInput>): Promise<Client | null>;
  /** يعيّن العميل كحساب الصندوق ويلغي التعيين عن غيره. */
  setCashBox(id: string): Promise<Client | null>;
  setSecret(id: string, isSecret: boolean): Promise<Client | null>;
  setArchived(id: string, archivedAt: Date | null): Promise<Client | null>;
  setLastRollover(id: string, at: Date): Promise<Client | null>;
  /** عدد قيود اليومية المرتبطة بالعميل (أي حالة حركة). */
  countJournalEntries(id: string): Promise<number>;
  delete(id: string): Promise<boolean>;
}
export interface CurrencyRepository {
  findById(id: string): Promise<Currency | null>;
  /** كل العملات (لكشف «كل العملات» — بلا ترقيم). */
  findAll(): Promise<Currency[]>;
  findPage(page: number, limit: number): Promise<Page<Currency>>;
  create(input: Omit<Currency, 'id'>): Promise<Currency>;
  update(id: string, input: Partial<Omit<Currency, 'id'>>): Promise<Currency | null>;
}
export interface MovementTypeRepository {
  findByCode(code: string): Promise<MovementType | null>;
  findById(id: string): Promise<MovementType | null>;
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
/** فلاتر سجل الحركات (GET /movements). */
export interface MovementListFilters {
  dateFrom?: string;
  dateTo?: string;
  movementTypeId?: string;
  clientId?: string;
  /** حركة تحتوي قيداً بهذه العملة. */
  currencyId?: string;
  status?: string;
  movementNo?: string;
  createdBy?: string;
  /** بحث نصي حر: رقم الحركة، البيان، اسم الحساب، اسم العملة، اسم المستخدم، نوع الحركة. */
  q?: string;
  page: number;
  limit: number;
}
/** سطر قيد مع أسماء العرض (للقوائم فقط). */
export interface MovementListLine {
  id: string;
  clientId: string;
  clientName: string;
  currencyId: string;
  currencyCode: string;
  currencyName: string;
  decimalPlaces: number;
  amountUs: string;
  amountThem: string;
  description: string | null;
}
export interface MovementListItem {
  id: string;
  movementNo: string;
  movementType: Pick<MovementType, 'id' | 'code' | 'name'>;
  status: Movement['status'];
  movementDate: string;
  movementTime: string;
  createdAt: string;
  totalResult: string;
  statement: string | null;
  createdBy: { id: string; fullName: string };
  entries: MovementListLine[];
  reversedAt: string | null;
}
export interface MovementListSummary {
  count: number;
  totalResult: string;
  totalUs: string;
  totalThem: string;
}
export interface MovementListPage {
  rows: MovementListItem[];
  count: number;
  summary: MovementListSummary;
}
/** ما يتغيّر في رأس الحركة عند التعديل/العكس في مكانها. */
export interface MovementContentsPatch {
  movementTypeId?: string;
  clientId?: string | null;
  description?: string | null;
  totalResult?: string;
  updatedBy: string;
  reversedAt?: Date | null;
  reversedBy?: string | null;
}
export interface MovementRepository {
  /** الرقم التسلسلي التالي للحركة (1، 2، 3…) — يُقرأ داخل المعاملة مع قفل لمنع التكرار. */
  nextNumber(): Promise<string>;
  create(input: Omit<Movement, 'id'> & { id?: string }): Promise<Movement>;
  findById(id: string): Promise<Movement | null>;
  findDetails(id: string): Promise<MovementDetails | null>;
  findListPage(filters: MovementListFilters): Promise<MovementListPage>;
  updateResult(id: string, result: string): Promise<void>;
  updateStatus(id: string, status: Movement['status'], updatedBy: string): Promise<void>;
  /** تعديل رأس الحركة في مكانها (نفس الرقم). */
  updateContents(id: string, patch: MovementContentsPatch): Promise<void>;
  /** حذف قيود الحركة وصفوف تفاصيلها (كل الأنواع) تمهيداً لإعادة بنائها بنفس المعرّف. */
  clearContents(id: string): Promise<void>;
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
  createdById: string;
  createdByName: string | null;
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
  /** مجاميع الفترة لكل عملة — تُملأ عند كشف «كل العملات» فقط. */
  periodByCurrency?: Array<{ currencyId: string; us: string; them: string }>;
}
export interface JournalRepository {
  /** قلب جهة كل قيد في الحركة (لنا ↔ علينا) في مكانه. */
  flipSides(movementId: string): Promise<void>;
  createMany(entries: JournalEntry[]): Promise<void>;
  findByMovement(movementId: string): Promise<JournalEntry[]>;
  findPage(filters: JournalFilters): Promise<JournalPage>;
  findStatementPage(filters: JournalFilters & { clientId: string; currencyId?: string }): Promise<StatementPage>;
}
export interface TransferRepository {
  create(input: Transfer): Promise<Transfer>;
  findByMovement(movementId: string): Promise<Transfer | null>;
  /** قلب الطرفين (من ↔ إلى) في مكانهما. */
  swapSides(movementId: string): Promise<void>;
}
export interface ExchangeRepository {
  create(input: Exchange): Promise<Exchange>;
  findByMovement(movementId: string): Promise<Exchange | null>;
  /** قلب اتجاه التصريف: العملتان والمجاميع تتبادلان، السعر يُقلب (1 ÷ السعر) والنتيجة تُعكس. */
  swapSides(movementId: string): Promise<void>;
}
export interface ReceiptPaymentRepository {
  create(input: ReceiptPayment): Promise<ReceiptPayment>;
  findByMovement(movementId: string): Promise<ReceiptPayment | null>;
  setType(movementId: string, type: ReceiptPaymentType): Promise<void>;
}
export interface NotificationRepository {
  create(input: Omit<Notification, 'id'>): Promise<Notification>;
  findPage(adminId: string, page: number, limit: number): Promise<{ rows: Notification[]; count: number }>;
  markRead(id: string, adminId: string): Promise<boolean>;
  countUnread(adminId: string): Promise<number>;
  markAllRead(adminId: string): Promise<number>;
}
/** ملخص تصفير البيانات (عدد الصفوف المحذوفة لكل جدول). */
export interface ResetSummary {
  journalEntries: number;
  movements: number;
  notifications: number;
  clients: number;
  clientGroups: number;
}
export interface SystemRepository {
  /** يحذف كل البيانات التجارية (الحركات وقيودها والإشعارات والعملاء غير النظاميين ومجموعاتهم) داخل المعاملة الجارية. */
  resetBusinessData(): Promise<ResetSummary>;
}
export interface Repositories {
  /** المكاتب — غير مقيّد بسياق مكتب. */
  officeRepository: OfficeRepository;
  /** إحصاءات المنصّة عبر المكاتب — للوحة التحكم. */
  platformStatsRepository: PlatformStatsRepository;
  adminRepository: AdminRepository;
  systemRepository: SystemRepository;
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
