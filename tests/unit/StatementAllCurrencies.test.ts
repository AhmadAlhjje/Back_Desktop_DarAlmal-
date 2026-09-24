import { describe, expect, it, vi } from 'vitest';
import { GetClientStatement } from '../../src/application/use-cases/journal/GetClientStatement.js';

/**
 * كشف حساب «كل العملات» (قرار المستخدم 2026-09-22): بلا `currencyId` يُعيد قيود كل العملات مع
 * عملة كل قيد ومجاميع الفترة لكل عملة، وبلا رصيد جارٍ (مختلط بلا معنى). العملة الواحدة كما كانت.
 */
const client = { id: '3', code: 'C-3', fullName: 'عميل' };
const usd = { id: '1', code: 'USD', name: 'دولار', symbol: '$' };
const syp = { id: '2', code: 'SYP', name: 'ليرة', symbol: 'ل.س' };

const entry = (currencyId: string, amount: string, side: 'US' | 'THEM') => ({
  movementId: '10',
  movementNo: '10',
  movementTypeCode: 'SETTLEMENT',
  movementDate: '2026-09-22',
  movementTime: '10:00:00',
  description: null,
  createdById: '1',
  createdByName: 'مدير',
  amount,
  side,
  exchangeRate: null,
  fees: '0',
  currencyId,
});

const make = (page: Record<string, unknown>) => {
  const journal = { findStatementPage: vi.fn().mockResolvedValue(page) } as never;
  const clients = { findById: vi.fn().mockResolvedValue(client) } as never;
  const currencies = { findById: vi.fn(async (id: string) => (id === '1' ? usd : syp)), findAll: vi.fn().mockResolvedValue([usd, syp]) } as never;
  return new GetClientStatement(journal, clients, currencies);
};

describe('GetClientStatement — all currencies', () => {
  it('returns per-entry currency, per-currency totals and no running balance', async () => {
    const s = make({
      rows: [entry('1', '100', 'US'), entry('2', '5000', 'THEM')],
      count: 2,
      opening: { us: '0', them: '0' },
      beforePage: { us: '0', them: '0' },
      period: { us: '100', them: '5000' },
      periodByCurrency: [
        { currencyId: '1', us: '100', them: '0' },
        { currencyId: '2', us: '0', them: '5000' },
      ],
    });
    const result = await s.execute({ clientId: '3', page: 1, limit: 50 });
    expect(result.currency).toBeNull();
    expect(result.openingBalance).toBeNull();
    expect(result.entries.map((e) => (e as { currency: { code: string } | null }).currency?.code)).toEqual(['USD', 'SYP']);
    expect(result.entries.every((e) => e.runningBalance === null)).toBe(true);
    const totals = (result as { totalsByCurrency: Array<{ currency: { code: string }; balance: string }> }).totalsByCurrency;
    expect(totals.map((t) => t.currency.code)).toEqual(['USD', 'SYP']);
    expect(totals[0].balance).toBe('100.00');
    expect(totals[1].balance).toBe('-5000.00');
  });

  it('a single-currency statement keeps its running balance and currency object', async () => {
    const s = make({
      rows: [entry('1', '100', 'US')],
      count: 1,
      opening: { us: '0', them: '0' },
      beforePage: { us: '0', them: '0' },
      period: { us: '100', them: '0' },
    });
    const result = await s.execute({ clientId: '3', currencyId: '1', page: 1, limit: 50 });
    expect(result.currency).toMatchObject({ code: 'USD' });
    expect(result.entries[0].runningBalance).toBe('100.00');
    expect(result.closingBalance).toBe('100.00');
  });
});
