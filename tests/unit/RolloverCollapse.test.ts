import { describe, expect, it, vi } from 'vitest';
import { GetClientStatement } from '../../src/application/use-cases/journal/GetClientStatement.js';
import { EntrySide } from '../../src/domain/enums/EntrySide.js';

/**
 * طيّ ما قبل «تدوير الأرصدة» (قرار المستخدم 2026-09-23): عند فتح عملة في كشف الحساب تُجمع كل
 * العمليات السابقة للتدوير في **سطر واحد** بنتيجتها النهائية (مدين لنا / دائن علينا / الرصيد)
 * بدل عرضها كلها، والنقر عليه يفتحها للمراجعة فقط (`scope=ROLLED_OVER`) بلا تعديل ولا حذف.
 */
const ROLLOVER_AT = '2026-09-20T12:00:00.000Z';

const row = (id: string, amount: string, side: EntrySide) => ({
  id,
  movementId: id,
  movementNo: id,
  movementTypeId: '1',
  movementTypeCode: 'TRANSFER',
  movementStatus: 'POSTED',
  lineNo: 1,
  clientId: '1',
  currencyId: '1',
  amount,
  side,
  exchangeRate: null,
  fees: '0',
  feePercentage: null,
  description: null,
  movementDate: '2026-09-21',
  movementTime: '10:00:00',
});

function make(lastRolloverAt: string | null) {
  const findStatementPage = vi.fn(async () => ({
    count: 1,
    opening: { us: '900', them: '400' },
    beforePage: { us: '0', them: '0' },
    period: { us: '200', them: '0' },
    rows: [row('9', '200', EntrySide.US)],
  }));
  const rolloverSummary = vi.fn(async () => ({ count: 17, us: '900', them: '400' }));
  const clients: any = { findById: async () => ({ id: '1', code: 'C1', fullName: 'عميل', lastRolloverAt }) };
  const currencies: any = { findById: async () => ({ id: '1', code: 'USD', name: 'دولار', symbol: '$' }), findAll: async () => [] };
  return { use: new GetClientStatement({ findStatementPage, rolloverSummary } as never, clients, currencies), findStatementPage, rolloverSummary };
}

describe('collapsing everything before the rollover into one line', () => {
  it('sums the old entries into a single result line and starts the period at the rollover moment', async () => {
    const { use, findStatementPage, rolloverSummary } = make(ROLLOVER_AT);
    const result = await use.execute({ clientId: '1', currencyId: '1', page: 1, limit: 50, collapseRollover: true });

    expect(findStatementPage).toHaveBeenCalledWith(expect.objectContaining({ fromAt: ROLLOVER_AT }));
    expect(rolloverSummary).toHaveBeenCalledWith({ clientId: '1', currencyId: '1', before: ROLLOVER_AT });
    expect(result.rolledOver).toMatchObject({ at: ROLLOVER_AT, count: 17, totalUs: '900', totalThem: '400' });
    expect(result.rolledOver!.balance).toBe('500.0000000000');
    // السطر المجمَّع هو نفسه الرصيد الافتتاحي للفترة الحالية — لا ازدواج ولا فجوة.
    expect(result.openingBalance).toBe('500.0000000000');
    expect(result.entries).toHaveLength(1);
    expect(result.scope).toBe('CURRENT');
  });

  it('an account that was never rolled over keeps the old behaviour (no extra line, no extra query)', async () => {
    const { use, findStatementPage, rolloverSummary } = make(null);
    const result = await use.execute({ clientId: '1', currencyId: '1', page: 1, limit: 50, collapseRollover: true });
    expect(result.rolledOver).toBeNull();
    expect(rolloverSummary).not.toHaveBeenCalled();
    expect(findStatementPage).toHaveBeenCalledWith(expect.not.objectContaining({ fromAt: expect.anything() }));
  });

  it('without collapse_rollover nothing changes (the statement lists every entry as before)', async () => {
    const { use, findStatementPage, rolloverSummary } = make(ROLLOVER_AT);
    const result = await use.execute({ clientId: '1', currencyId: '1', page: 1, limit: 50 });
    expect(result.rolledOver).toBeNull();
    expect(rolloverSummary).not.toHaveBeenCalled();
    expect(findStatementPage).toHaveBeenCalledWith(expect.not.objectContaining({ fromAt: expect.anything() }));
  });

  it('review scope returns only the collapsed entries, ignoring the user date range, and adds no summary line', async () => {
    const { use, findStatementPage, rolloverSummary } = make(ROLLOVER_AT);
    const result = await use.execute({
      clientId: '1',
      currencyId: '1',
      page: 1,
      limit: 50,
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      collapseRollover: true,
      scope: 'ROLLED_OVER',
    });
    expect(findStatementPage).toHaveBeenCalledWith(
      expect.objectContaining({ beforeAt: ROLLOVER_AT, dateFrom: undefined, dateTo: undefined }),
    );
    expect(rolloverSummary).not.toHaveBeenCalled();
    expect(result.rolledOver).toBeNull();
    expect(result.scope).toBe('ROLLED_OVER');
  });

  it('reviewing an account with no rollover is refused instead of showing everything', async () => {
    const { use } = make(null);
    await expect(use.execute({ clientId: '1', currencyId: '1', page: 1, limit: 50, scope: 'ROLLED_OVER' })).rejects.toMatchObject({
      code: 'NO_ROLLOVER',
      status: 404,
    });
  });

  it('all-currencies statement collapses per currency with the currency names resolved', async () => {
    const findStatementPage = vi.fn(async () => ({
      count: 0,
      opening: { us: '0', them: '0' },
      beforePage: { us: '0', them: '0' },
      period: { us: '0', them: '0' },
      rows: [],
      periodByCurrency: [],
    }));
    const rolloverSummary = vi.fn(async () => ({
      count: 5,
      us: '1000',
      them: '250',
      byCurrency: [{ currencyId: '1', us: '1000', them: '250', count: 5 }],
    }));
    const clients: any = { findById: async () => ({ id: '1', code: 'C1', fullName: 'عميل', lastRolloverAt: ROLLOVER_AT }) };
    const currencies: any = { findAll: async () => [{ id: '1', code: 'USD', name: 'دولار', symbol: '$' }] };
    const result = await new GetClientStatement({ findStatementPage, rolloverSummary } as never, clients, currencies).execute({
      clientId: '1',
      page: 1,
      limit: 50,
      collapseRollover: true,
    });
    expect(result.rolledOver!.byCurrency).toEqual([
      { currency: { id: '1', code: 'USD', name: 'دولار', symbol: '$' }, count: 5, totalUs: '1000', totalThem: '250', balance: '750.0000000000' },
    ]);
  });
});
