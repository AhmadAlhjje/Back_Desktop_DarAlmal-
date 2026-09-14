import { Decimal } from 'decimal.js';
import { EntrySide } from '../../../domain/enums/EntrySide.js';
import type {
  ClientRepository,
  CurrencyRepository,
  JournalFilters,
  JournalRepository,
} from '../../ports/repositories/types.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
const net = (value: { us: string; them: string }) => new Decimal(value.us).minus(value.them);
export class GetClientStatement {
  constructor(
    private journal: JournalRepository,
    private clients: ClientRepository,
    private currencies: CurrencyRepository,
  ) {}
  async execute(filters: JournalFilters & { clientId: string; currencyId: string }) {
    const [client, currency, result] = await Promise.all([
      this.clients.findById(filters.clientId),
      this.currencies.findById(filters.currencyId),
      this.journal.findStatementPage(filters),
    ]);
    if (!client) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    if (!currency) throw new ApplicationError('CURRENCY_NOT_FOUND', 'Currency not found', 404);
    const openingBalance = net(result.opening);
    // الصفوف بترتيب تنازلي (الأحدث أولاً): نبدأ من الرصيد بعد أحدث قيد في الصفحة
    // = الافتتاحي + صافي الفترة − صافي القيود الأحدث من الصفحة، ثم ننزل بطرح أثر كل قيد.
    let running = openingBalance.add(net(result.period)).sub(net(result.beforePage));
    const entries = result.rows.map((entry) => {
      const balanceAfter = running;
      running = entry.side === EntrySide.US ? running.sub(entry.amount) : running.add(entry.amount);
      return {
        movementId: entry.movementId,
        movementNo: entry.movementNo,
        movementType: entry.movementTypeCode,
        date: entry.movementDate,
        time: entry.movementTime,
        description: entry.description,
        createdById: entry.createdById,
        createdByName: entry.createdByName,
        amount: entry.amount,
        side: entry.side,
        exchangeRate: entry.exchangeRate,
        fees: entry.fees,
        runningBalance: balanceAfter.toFixed(4),
      };
    });
    return {
      client: { id: client.id, code: client.code, fullName: client.fullName },
      currency: { id: currency.id, code: currency.code, name: currency.name, symbol: currency.symbol },
      openingBalance: openingBalance.toFixed(4),
      entries,
      totalUs: result.period.us,
      totalThem: result.period.them,
      closingBalance: openingBalance.add(net(result.period)).toFixed(4),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.count,
        pages: Math.ceil(result.count / filters.limit),
      },
    };
  }
}
