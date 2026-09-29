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
  /** أرصدة عميل واحد لكل عملة (اختيارياً حتى تاريخ، أو حتى لحظة دقيقة من الواجهة). */
  clientBalances(clientId: string, asOf?: string, asOfAt?: Date): Promise<BalanceAggregateRow[]>;
  /** أرصدة كل العملاء × العملات (اختيارياً حتى تاريخ / لعملة واحدة). */
  allBalances(filters: {
    asOf?: string;
    /** نهاية اليوم كلحظة بتوقيت المستخدم — تُقدَّم على asOf (انظر periodEnd). */
    asOfAt?: Date;
    currencyId?: string;
    clientQuery?: string;
    /** إظهار الحسابات السرّية (دور ADMIN فقط). */
    includeSecret?: boolean;
  }): Promise<BalanceAggregateRow[]>;
  /**
   * عدد الحركات ومجموع نواتجها في يوم معيّن. `fromAt`/`toAt` (من الواجهة) هما بداية اليوم
   * ونهايته بتوقيت المستخدم ويُقدَّمان على `date` الذي يعني يوماً بتوقيت UTC.
   */
  dayStats(date: string, fromAt?: Date, toAt?: Date): Promise<{ count: number; totalResult: string }>;
  /** سلسلة يومية لآخر N يوماً (عدد ومجموع الناتج). */
  dailySeries(days: number): Promise<DailyPoint[]>;
}
