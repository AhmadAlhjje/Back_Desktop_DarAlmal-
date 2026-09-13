import { Decimal } from 'decimal.js';
import { BalanceValuationService } from '../../../domain/services/BalanceValuationService.js';
import type { BalanceAggregateRow, ReportsRepository } from '../../ports/repositories/ReportsRepository.js';

export interface BalanceSheetFilters {
  asOf?: string;
  currencyId?: string;
  /** valued = الصندوق المقوّم (كل العملات مقوّمة بالدولار لكل حساب) | currency = صندوق العملات (صف لكل عملة). */
  mode: 'valued' | 'currency';
  /** simple = الحسابات ذات الرصيد فقط | full = كل الحسابات حتى المتوازنة. */
  detail: 'simple' | 'full';
  clientQuery?: string;
  /** إظهار الحسابات السرّية (دور ADMIN فقط). */
  includeSecret?: boolean;
}

interface SheetRow {
  client: { id: string; code: string; fullName: string };
  currency: { id: string; code: string; name: string; decimalPlaces: number } | null;
  totalUs: string;
  totalThem: string;
  balance: string;
  balanceUs: string;
  balanceThem: string;
  valuedTotalUs: string;
  valuedTotalThem: string;
  valuedBalanceUs: string;
  valuedBalanceThem: string;
}

/** الميزانية العامة: كل الحسابات مع إجمالي لنا/علينا ورصيد لنا/علينا (الفرق مقوّم بالدولار). */
export class GetBalanceSheet {
  constructor(
    private reports: ReportsRepository,
    private valuation = new BalanceValuationService(),
  ) {}
  async execute(filters: BalanceSheetFilters) {
    const rows = await this.reports.allBalances({
      asOf: filters.asOf,
      currencyId: filters.currencyId,
      clientQuery: filters.clientQuery,
      includeSecret: filters.includeSecret,
    });
    const items = filters.mode === 'valued' ? this.valuedRows(rows) : this.currencyRows(rows);
    const visible = filters.detail === 'full' ? items : items.filter((i) => !new Decimal(i.balance).isZero());
    const totals = {
      totalUs: this.valuation.sum(visible.map((i) => i.valuedTotalUs)),
      totalThem: this.valuation.sum(visible.map((i) => i.valuedTotalThem)),
      balanceUs: this.valuation.sum(visible.map((i) => i.valuedBalanceUs)),
      balanceThem: this.valuation.sum(visible.map((i) => i.valuedBalanceThem)),
    };
    return {
      mode: filters.mode,
      detail: filters.detail,
      asOf: filters.asOf ?? null,
      rows: visible.map((i, index) => ({ index: index + 1, ...i })),
      totals: { ...totals, difference: new Decimal(totals.balanceUs).minus(totals.balanceThem).toFixed(4) },
    };
  }

  private currencyRows(rows: BalanceAggregateRow[]): SheetRow[] {
    return rows.map((r) => {
      const balance = this.valuation.net(r.totalUs, r.totalThem);
      const positive = new Decimal(balance).gt(0);
      const toUsd = (v: string) => this.valuation.toUsd(v, r.exchangeRate, r.exchangeType);
      const balanceUs = positive ? balance : '0.0000';
      const balanceThem = positive ? '0.0000' : new Decimal(balance).abs().toFixed(4);
      return {
        client: { id: r.clientId, code: r.clientCode, fullName: r.clientName },
        currency: { id: r.currencyId, code: r.currencyCode, name: r.currencyName, decimalPlaces: r.decimalPlaces },
        totalUs: r.totalUs,
        totalThem: r.totalThem,
        balance,
        balanceUs,
        balanceThem,
        valuedTotalUs: toUsd(r.totalUs),
        valuedTotalThem: toUsd(r.totalThem),
        valuedBalanceUs: toUsd(balanceUs),
        valuedBalanceThem: toUsd(balanceThem),
      };
    });
  }

  private valuedRows(rows: BalanceAggregateRow[]): SheetRow[] {
    const byClient = new Map<string, SheetRow[]>();
    for (const r of this.currencyRows(rows)) {
      const list = byClient.get(r.client.id) ?? [];
      list.push(r);
      byClient.set(r.client.id, list);
    }
    return [...byClient.values()].map((list) => {
      const totalUs = this.valuation.sum(list.map((r) => r.valuedTotalUs));
      const totalThem = this.valuation.sum(list.map((r) => r.valuedTotalThem));
      const balance = this.valuation.net(totalUs, totalThem);
      const positive = new Decimal(balance).gt(0);
      const balanceUs = positive ? balance : '0.0000';
      const balanceThem = positive ? '0.0000' : new Decimal(balance).abs().toFixed(4);
      return {
        client: list[0].client,
        currency: null,
        totalUs,
        totalThem,
        balance,
        balanceUs,
        balanceThem,
        valuedTotalUs: totalUs,
        valuedTotalThem: totalThem,
        valuedBalanceUs: balanceUs,
        valuedBalanceThem: balanceThem,
      };
    });
  }
}
