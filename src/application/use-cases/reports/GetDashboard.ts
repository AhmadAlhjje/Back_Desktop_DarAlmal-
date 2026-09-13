import { Decimal } from 'decimal.js';
import { BalanceValuationService } from '../../../domain/services/BalanceValuationService.js';
import type { ReportsRepository } from '../../ports/repositories/ReportsRepository.js';
import type { MovementRepository } from '../../ports/repositories/types.js';
import type { Clock } from '../../ports/services/Clock.js';

interface CurrencyAccumulator {
  currency: Record<string, unknown>;
  us: Decimal;
  them: Decimal;
  rate: string;
  type: 'FROM_USD_MULTIPLY' | 'TO_USD_DIVIDE';
}

/** لوحة التحكم: الرصيد المقوّم الإجمالي، أرباح/خسائر اليوم، أرصدة العملات، آخر الحركات، سلسلة 30 يوماً. */
export class GetDashboard {
  constructor(
    private reports: ReportsRepository,
    private movements: MovementRepository,
    private clock: Clock,
    private valuation = new BalanceValuationService(),
  ) {}
  async execute() {
    const today = this.clock.now().toISOString().slice(0, 10);
    const [rows, day, series, recent] = await Promise.all([
      this.reports.allBalances({}),
      this.reports.dayStats(today),
      this.reports.dailySeries(30),
      this.movements.findListPage({ page: 1, limit: 10 }),
    ]);
    const byCurrency = new Map<string, CurrencyAccumulator>();
    for (const r of rows) {
      const acc = byCurrency.get(r.currencyId) ?? {
        currency: {
          id: r.currencyId,
          code: r.currencyCode,
          name: r.currencyName,
          symbol: r.currencySymbol,
          decimalPlaces: r.decimalPlaces,
        },
        us: new Decimal(0),
        them: new Decimal(0),
        rate: r.exchangeRate,
        type: r.exchangeType,
      };
      acc.us = acc.us.plus(r.totalUs);
      acc.them = acc.them.plus(r.totalThem);
      byCurrency.set(r.currencyId, acc);
    }
    const currencies = [...byCurrency.values()].map((c) => {
      const balance = c.us.minus(c.them).toFixed(4);
      return {
        currency: c.currency,
        totalUs: c.us.toFixed(4),
        totalThem: c.them.toFixed(4),
        balance,
        valuedUsd: this.valuation.toUsd(balance, c.rate, c.type),
      };
    });
    return {
      date: today,
      todayMovementsCount: day.count,
      dailyProfitLoss: day.totalResult,
      totalValuedBalance: this.valuation.sum(currencies.map((c) => c.valuedUsd)),
      currencies,
      recentMovements: recent.rows,
      last30Days: series,
    };
  }
}
