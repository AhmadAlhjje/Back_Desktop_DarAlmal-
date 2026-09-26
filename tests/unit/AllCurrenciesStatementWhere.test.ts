import { describe, expect, it, vi } from 'vitest';
import { clientCurrencyWhere } from '../../src/infrastructure/database/sequelize/where.js';
import { GetClientStatement } from '../../src/application/use-cases/journal/GetClientStatement.js';

/**
 * بلاغ 2026-09-26: «كشف حساب + كل العملات» كان يعطي «حدث خطأ — خطأ في الخادم» أحياناً.
 * السبب: كشف كل العملات يمرّر `currencyId = undefined`، وSequelize يرمي عند وجود قيمة undefined
 * داخل `where` («WHERE parameter "currency_id" has invalid "undefined" value») — وكان يحدث فقط
 * للحسابات المدوَّرة لأن الرصيد الافتتاحي يُحسب عندها دائماً (حدّ `fromAt`).
 */
describe('all-currencies statement never builds an undefined where value', () => {
  it('drops the currency key entirely instead of passing undefined', () => {
    const all = clientCurrencyWhere('7');
    expect(all).toEqual({ client_id: '7' });
    expect('currency_id' in all).toBe(false);
    expect(Object.values(all)).not.toContain(undefined);

    const one = clientCurrencyWhere('7', '2');
    expect(one).toEqual({ client_id: '7', currency_id: '2' });
    expect(Object.values(one)).not.toContain(undefined);
  });

  it('a rolled-over account with every currency still returns a statement', async () => {
    const findStatementPage = vi.fn(async (filters: { currencyId?: string }) => {
      // نحاكي ما يفعله Sequelize: قيمة undefined داخل where تُسقِط الطلب كله.
      const where = clientCurrencyWhere('1', filters.currencyId);
      if (Object.values(where).includes(undefined)) throw new Error('WHERE parameter has invalid "undefined" value');
      return {
        count: 0,
        opening: { us: '0', them: '0' },
        beforePage: { us: '0', them: '0' },
        period: { us: '0', them: '0' },
        rows: [],
        periodByCurrency: [],
      };
    });
    const rolloverSummary = vi.fn(async () => ({ count: 3, us: '100', them: '40', byCurrency: [] }));
    const clients: any = {
      findById: async () => ({ id: '1', code: 'C1', fullName: 'عميل', lastRolloverAt: '2026-09-20T12:00:00.000Z' }),
    };
    const currencies: any = { findAll: async () => [] };

    const result = await new GetClientStatement({ findStatementPage, rolloverSummary } as never, clients, currencies).execute({
      clientId: '1',
      page: 1,
      limit: 50,
      collapseRollover: true,
    });
    expect(result.currency).toBeNull();
    expect(result.rolledOver).toMatchObject({ count: 3 });
    // الحدّ الزمني كائن Date لا نصّ ISO
    expect(findStatementPage.mock.calls[0][0]).toMatchObject({ fromAt: new Date('2026-09-20T12:00:00.000Z') });
  });
});
