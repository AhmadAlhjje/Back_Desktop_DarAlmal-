/** صف تجميعي: مجموع لنا/علينا لعميل وعملة (حركات POSTED فقط). */
export interface BalanceAggregateRow {
  clientId: string;
  clientName: string;
  clientCode: string;
  currencyId: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string | null;
  decimalPlaces: number;
  exchangeRate: string;
  exchangeType: 'FROM_USD_MULTIPLY' | 'TO_USD_DIVIDE';
  totalUs: string;
  totalThem: string;
}
export interface DailyPoint {
  date: string;
  count: number;
  totalResult: string;
}
export interface ReportsRepository {
  /** أرصدة عميل واحد لكل عملة (اختيارياً حتى تاريخ). */
  clientBalances(clientId: string, asOf?: string): Promise<BalanceAggregateRow[]>;
  /** أرصدة كل العملاء × العملات (اختيارياً حتى تاريخ / لعملة واحدة). */
  allBalances(filters: {
    asOf?: string;
    currencyId?: string;
    clientQuery?: string;
    /** إظهار الحسابات السرّية (دور ADMIN فقط). */
    includeSecret?: boolean;
  }): Promise<BalanceAggregateRow[]>;
  /** عدد الحركات ومجموع نواتجها في يوم معيّن. */
  dayStats(date: string): Promise<{ count: number; totalResult: string }>;
  /** سلسلة يومية لآخر N يوماً (عدد ومجموع الناتج). */
  dailySeries(days: number): Promise<DailyPoint[]>;
}
