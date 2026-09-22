import { Decimal } from 'decimal.js';
import { EntrySide } from '../../../domain/enums/EntrySide.js';
import type {
  ClientRepository,
  CurrencyRepository,
  JournalFilters,
  JournalRepository,
} from '../../ports/repositories/types.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import { AMOUNT_SCALE } from '../../../domain/value-objects/Precision.js';
const net = (value: { us: string; them: string }) => new Decimal(value.us).minus(value.them);
export class GetClientStatement {
  constructor(
    private journal: JournalRepository,
    private clients: ClientRepository,
    private currencies: CurrencyRepository,
  ) {}
  async execute(filters: JournalFilters & { clientId: string; currencyId?: string }) {
    const [client, currency, result] = await Promise.all([
      this.clients.findById(filters.clientId),
      filters.currencyId ? this.currencies.findById(filters.currencyId) : Promise.resolve(null),
      this.journal.findStatementPage(filters),
    ]);
    if (!client) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    if (filters.currencyId && !currency) throw new ApplicationError('CURRENCY_NOT_FOUND', 'Currency not found', 404);
    // كشف «كل العملات» (قرار المستخدم 2026-09-22): كل القيود بعمود العملة، بلا رصيد جارٍ مختلط،
    // ومجاميع الفترة مفصّلة لكل عملة.
    if (!filters.currencyId) return this.allCurrencies(client, result, filters);
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
        runningBalance: balanceAfter.toFixed(AMOUNT_SCALE),
      };
    });
    return {
      client: { id: client.id, code: client.code, fullName: client.fullName },
      currency: { id: currency!.id, code: currency!.code, name: currency!.name, symbol: currency!.symbol },
      openingBalance: openingBalance.toFixed(AMOUNT_SCALE),
      entries,
      totalUs: result.period.us,
      totalThem: result.period.them,
      closingBalance: openingBalance.add(net(result.period)).toFixed(AMOUNT_SCALE),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.count,
        pages: Math.ceil(result.count / filters.limit),
      },
    };
  }

  private async allCurrencies(
    client: { id: string; code: string; fullName: string },
    result: Awaited<ReturnType<JournalRepository['findStatementPage']>>,
    filters: { page: number; limit: number },
  ) {
    const currencies = await this.currencies.findAll();
    const byId = new Map(currencies.map((c) => [c.id, c]));
    const totals = (result.periodByCurrency ?? []).map((row) => {
      const c = byId.get(row.currencyId);
      return {
        currency: c ? { id: c.id, code: c.code, name: c.name, symbol: c.symbol } : { id: row.currencyId, code: '', name: '', symbol: '' },
        totalUs: row.us,
        totalThem: row.them,
        balance: new Decimal(row.us).minus(row.them).toFixed(AMOUNT_SCALE),
      };
    });
    return {
      client: { id: client.id, code: client.code, fullName: client.fullName },
      currency: null,
      openingBalance: null,
      entries: result.rows.map((entry) => {
        const c = byId.get(entry.currencyId);
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
          // رصيد جارٍ بعملات مختلطة بلا معنى — يُترك فارغاً ويُعرض «—».
          runningBalance: null,
          currency: c ? { id: c.id, code: c.code, name: c.name, symbol: c.symbol } : null,
        };
      }),
      totalUs: result.period.us,
      totalThem: result.period.them,
      closingBalance: null,
      totalsByCurrency: totals,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.count,
        pages: Math.ceil(result.count / filters.limit),
      },
    };
  }
}
