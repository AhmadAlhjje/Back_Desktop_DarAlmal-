import { describe, expect, it, vi } from 'vitest';
import { periodEnd, periodStart } from '../../src/infrastructure/database/sequelize/where.js';
import {
  balanceSheetQuerySchema,
  balancesQuerySchema,
  dashboardQuerySchema,
  journalQuerySchema,
  movementsQuerySchema,
  statementQuerySchema,
} from '../../src/presentation/http/validators/querySchemas.js';
import { GetClientStatement } from '../../src/application/use-cases/journal/GetClientStatement.js';
import { GetDashboard } from '../../src/application/use-cases/reports/GetDashboard.js';

/**
 * فلتر «من اليوم إلى اليوم» لم يكن يُظهر حركات اليوم (بلاغ المستخدم 2026-09-30): الطوابع مخزّنة
 * بتوقيت UTC، ودمشق UTC+3، فحركة الساعة الواحدة صباحاً تُخزَّن على تاريخ اليوم السابق فتسقط من
 * المقارنة بتاريخ محلي — وتظهر فقط إذا فلتر المستخدم «من الأمس إلى اليوم». الحل: الواجهة ترسل
 * لحظتَي بداية اليوم ونهايته **بتوقيتها** (`from_at`/`to_at`) وتُقدَّمان على التاريخ النصي.
 */
const DAMASCUS = '+03:00';
const TODAY = '2026-09-30';
/** حركة أُنشئت الساعة 01:00 بدمشق = 22:00 من اليوم السابق بـ UTC. */
const AFTER_MIDNIGHT = new Date('2026-09-29T22:00:00.000Z');
/** حركة أُنشئت الساعة 23:30 بدمشق = 20:30 من نفس اليوم بـ UTC. */
const BEFORE_MIDNIGHT = new Date('2026-09-30T20:30:00.000Z');

const dayStart = (day: string) => new Date(`${day}T00:00:00.000${DAMASCUS}`);
const dayEnd = (day: string) => new Date(`${day}T23:59:59.999${DAMASCUS}`);

describe('حدود اليوم بتوقيت المستخدم', () => {
  it('a movement made after midnight falls outside the day-string bounds but inside the precise ones', () => {
    // السلوك القديم: نصّ التاريخ المحلي يقارن بطابع UTC.
    expect(periodStart(undefined, TODAY)).toBe(`${TODAY} 00:00:00`);
    expect(periodEnd(undefined, TODAY)).toBe(`${TODAY} 23:59:59`);
    expect(AFTER_MIDNIGHT.getTime()).toBeLessThan(Date.parse(`${TODAY}T00:00:00.000Z`));

    // بعد الإصلاح: الحدّان لحظتان دقيقتان، فالحركتان كلتاهما داخل «اليوم».
    const from = dayStart(TODAY);
    const to = dayEnd(TODAY);
    for (const createdAt of [AFTER_MIDNIGHT, BEFORE_MIDNIGHT]) {
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(from.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(to.getTime());
    }
  });

  it('the precise bounds win over the day strings, and the day strings still work alone', () => {
    const from = dayStart(TODAY);
    const to = dayEnd(TODAY);
    expect(periodStart(from, TODAY)).toBe(from);
    expect(periodEnd(to, TODAY)).toBe(to);
    expect(periodStart(undefined, undefined)).toBeUndefined();
    expect(periodEnd(undefined, undefined)).toBeUndefined();
  });

  it('a movement of the previous day stays out of a today→today filter', () => {
    const yesterdayEvening = new Date(`2026-09-29T20:00:00.000${DAMASCUS}`);
    expect(yesterdayEvening.getTime()).toBeLessThan(dayStart(TODAY).getTime());
  });
});

describe('مخطّطات الاستعلام تقبل اللحظات الدقيقة', () => {
  const instants = { from_at: `${TODAY}T00:00:00.000${DAMASCUS}`, to_at: `${TODAY}T23:59:59.999${DAMASCUS}` };

  it('journal, movements and statement parse from_at/to_at into Date objects', () => {
    for (const schema of [journalQuerySchema, movementsQuerySchema, statementQuerySchema]) {
      const parsed = schema.parse({ date_from: TODAY, date_to: TODAY, ...instants });
      // كائن Date لا نصّ ISO: النصّ `…T…Z` غير صالح للمقارنة في MySQL.
      expect(parsed.from_at).toBeInstanceOf(Date);
      expect(parsed.to_at).toBeInstanceOf(Date);
      expect(parsed.from_at!.toISOString()).toBe('2026-09-29T21:00:00.000Z');
    }
  });

  it('the dashboard accepts the user day too', () => {
    expect(dashboardQuerySchema.parse(instants).from_at).toBeInstanceOf(Date);
  });

  it('the as-of reports accept a precise instant too', () => {
    expect(balancesQuerySchema.parse({ as_of_at: instants.to_at }).as_of_at).toBeInstanceOf(Date);
    expect(balanceSheetQuerySchema.parse({ as_of_at: instants.to_at }).as_of_at).toBeInstanceOf(Date);
  });

  it('an instant without an offset is rejected (the offset is what makes it unambiguous)', () => {
    expect(journalQuerySchema.safeParse({ from_at: '2026-09-30 00:00:00' }).success).toBe(false);
    expect(journalQuerySchema.safeParse({ from_at: '2026-09-30' }).success).toBe(false);
  });

  it('the day-only filters keep working for callers that send no instant', () => {
    const parsed = movementsQuerySchema.parse({ date_from: TODAY, date_to: TODAY });
    expect(parsed.from_at).toBeUndefined();
    expect(parsed.date_from).toBe(TODAY);
  });
});

describe('كشف الحساب: حدّ الطيّ وحدّ المستخدم', () => {
  type PageFilters = Record<string, any>;
  function make(lastRolloverAt: string | null) {
    const findStatementPage = vi.fn(async (_filters: PageFilters) => ({
      count: 0,
      opening: { us: '0', them: '0' },
      beforePage: { us: '0', them: '0' },
      period: { us: '0', them: '0' },
      rows: [],
    }));
    const rolloverSummary = vi.fn(async () => ({ count: 2, us: '10', them: '4' }));
    const clients: any = { findById: async () => ({ id: '1', code: 'C1', fullName: 'عميل', lastRolloverAt }) };
    const currencies: any = {
      findById: async () => ({ id: '1', code: 'USD', name: 'دولار', symbol: '$' }),
      findAll: async () => [],
    };
    return {
      use: new GetClientStatement({ findStatementPage, rolloverSummary } as never, clients, currencies),
      findStatementPage,
    };
  }

  it('keeps the later of the two «from» bounds when collapsing a rolled-over account', async () => {
    const { use, findStatementPage } = make('2026-09-20T12:00:00.000Z');
    const userFrom = dayStart(TODAY); // أحدث من لحظة التدوير
    await use.execute({ clientId: '1', currencyId: '1', fromAt: userFrom, toAt: dayEnd(TODAY), collapseRollover: true, page: 1, limit: 20 });
    expect(findStatementPage.mock.calls[0][0]).toMatchObject({ fromAt: userFrom, toAt: dayEnd(TODAY) });

    const older = make('2026-09-20T12:00:00.000Z');
    await older.use.execute({ clientId: '1', currencyId: '1', fromAt: new Date('2026-09-01T00:00:00.000Z'), collapseRollover: true, page: 1, limit: 20 });
    // بداية فترة المستخدم أقدم من التدوير: يبقى حدّ التدوير هو الفعّال (المطويّ لا يُعرض مرّتين).
    expect(older.findStatementPage.mock.calls[0][0].fromAt.toISOString()).toBe('2026-09-20T12:00:00.000Z');
  });

  it('the review screen ignores the user period entirely', async () => {
    const { use, findStatementPage } = make('2026-09-20T12:00:00.000Z');
    await use.execute({
      clientId: '1',
      currencyId: '1',
      fromAt: dayStart(TODAY),
      toAt: dayEnd(TODAY),
      dateFrom: TODAY,
      dateTo: TODAY,
      scope: 'ROLLED_OVER',
      page: 1,
      limit: 20,
    });
    const passed = findStatementPage.mock.calls[0][0];
    expect(passed.beforeAt.toISOString()).toBe('2026-09-20T12:00:00.000Z');
    for (const key of ['fromAt', 'toAt', 'dateFrom', 'dateTo']) expect(passed[key]).toBeUndefined();
  });
});

describe('«حركات اليوم» في لوحة التحكم', () => {
  it('counts the user day, not the UTC day', async () => {
    const dayStats = vi.fn(async () => ({ count: 0, totalResult: '0' }));
    const reports: any = {
      allBalances: async () => [],
      dayStats,
      dailySeries: async () => [],
    };
    const movements: any = { findListPage: async () => ({ rows: [], count: 0, summary: {} }) };
    const clock: any = { now: () => new Date('2026-09-30T00:30:00.000Z') };
    const from = dayStart(TODAY);
    const to = dayEnd(TODAY);
    await new GetDashboard(reports, movements, clock).execute({ fromAt: from, toAt: to });
    expect(dayStats).toHaveBeenCalledWith('2026-09-30', from, to);

    // بلا حدود من الواجهة يبقى السلوك القديم (يوم UTC) — لمن لا يرسلها.
    await new GetDashboard(reports, movements, clock).execute();
    expect(dayStats).toHaveBeenLastCalledWith('2026-09-30', undefined, undefined);
  });
});
