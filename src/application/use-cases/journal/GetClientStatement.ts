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

/**
 * طيّ ما قبل «تدوير الأرصدة» (قرار المستخدم 2026-09-23): بدل عرض كل العمليات القديمة، تُجمع في
 * **سطر واحد** بنتيجتها النهائية (مدين لنا / دائن علينا / الرصيد، ولكل عملة في كشف كل العملات)،
 * والنقر عليه يفتحها للمراجعة فقط عبر `scope: 'ROLLED_OVER'` — بلا تعديل ولا حذف.
 */
export type StatementScope = 'CURRENT' | 'ROLLED_OVER';
export class GetClientStatement {
  constructor(
    private journal: JournalRepository,
    private clients: ClientRepository,
    private currencies: CurrencyRepository,
  ) {}
  async execute(
    filters: JournalFilters & { clientId: string; currencyId?: string; collapseRollover?: boolean; scope?: StatementScope },
  ) {
    const client = await this.clients.findById(filters.clientId);
    if (!client) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    // لحظة آخر تدوير: حدّ الطيّ. بلا تدوير لا يتغيّر شيء (الكشف كما كان).
    const rolloverAt = client.lastRolloverAt ?? null;
    const collapsing = Boolean(filters.collapseRollover && rolloverAt);
    const reviewing = filters.scope === 'ROLLED_OVER';
    if (reviewing && !rolloverAt)
      throw new ApplicationError('NO_ROLLOVER', 'لا يوجد تدوير سابق لهذا الحساب', 404);
    const pageFilters: JournalFilters & { clientId: string; currencyId?: string } = {
      ...filters,
      // المراجعة: القيود المطويّة وحدها (بلا حدود تاريخ المستخدم). الطيّ: من لحظة التدوير فصاعداً.
      ...(reviewing
        ? { beforeAt: rolloverAt!, dateFrom: undefined, dateTo: undefined }
        : collapsing
          ? { fromAt: rolloverAt! }
          : {}),
    };
    const [currency, result] = await Promise.all([
      filters.currencyId ? this.currencies.findById(filters.currencyId) : Promise.resolve(null),
      this.journal.findStatementPage(pageFilters),
    ]);
    if (filters.currencyId && !currency) throw new ApplicationError('CURRENCY_NOT_FOUND', 'Currency not found', 404);
    // سطر ما قبل التدوير (في الكشف الحالي فقط — لا داخل شاشة المراجعة نفسها).
    const rolledOver =
      collapsing && !reviewing
        ? await this.journal.rolloverSummary({ clientId: filters.clientId, currencyId: filters.currencyId, before: rolloverAt! })
        : null;
    const rolloverBlock = rolledOver
      ? {
          at: rolloverAt,
          count: rolledOver.count,
          totalUs: rolledOver.us,
          totalThem: rolledOver.them,
          balance: new Decimal(rolledOver.us).minus(rolledOver.them).toFixed(AMOUNT_SCALE),
          ...(rolledOver.byCurrency && { byCurrency: rolledOver.byCurrency }),
        }
      : null;
    // كشف «كل العملات» (قرار المستخدم 2026-09-22): كل القيود بعمود العملة، بلا رصيد جارٍ مختلط،
    // ومجاميع الفترة مفصّلة لكل عملة.
    if (!filters.currencyId) return { ...(await this.allCurrencies(client, result, filters)), scope: filters.scope ?? 'CURRENT', rolledOver: await this.withCurrencyNames(rolloverBlock) };
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
      // سطر مجمَّع لكل ما قبل التدوير (null = لا تدوير أو نحن داخل شاشة المراجعة).
      rolledOver: rolloverBlock,
      scope: filters.scope ?? 'CURRENT',
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.count,
        pages: Math.ceil(result.count / filters.limit),
      },
    };
  }

  /** أسماء العملات لسطر ما قبل التدوير في كشف «كل العملات». */
  private async withCurrencyNames(
    block: {
      at: string | null;
      count: number;
      totalUs: string;
      totalThem: string;
      balance: string;
      byCurrency?: Array<{ currencyId: string; us: string; them: string; count: number }>;
    } | null,
  ) {
    if (!block?.byCurrency) return block;
    const currencies = await this.currencies.findAll();
    const byId = new Map(currencies.map((c) => [c.id, c]));
    return {
      ...block,
      byCurrency: block.byCurrency.map((row) => {
        const c = byId.get(row.currencyId);
        return {
          currency: c ? { id: c.id, code: c.code, name: c.name, symbol: c.symbol } : { id: row.currencyId, code: '', name: '', symbol: '' },
          count: row.count,
          totalUs: row.us,
          totalThem: row.them,
          balance: new Decimal(row.us).minus(row.them).toFixed(AMOUNT_SCALE),
        };
      }),
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
