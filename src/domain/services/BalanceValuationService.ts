import { Decimal } from 'decimal.js';

export type CurrencyExchangeType = 'FROM_USD_MULTIPLY' | 'TO_USD_DIVIDE';

/**
 * تقييم الأرصدة بالدولار (المرجع الوحيد للمعادلة — معتمد 2026-09-13).
 *
 * FROM_USD_MULTIPLY: 1 USD = rate × العملة  ⇒ valuedUsd = amount ÷ rate
 * TO_USD_DIVIDE:     1 العملة = rate USD    ⇒ valuedUsd = amount × rate
 * كل الحسابات بـ decimal.js؛ النتيجة بأربع منازل.
 */
export class BalanceValuationService {
  static readonly SCALE = 4;

  toUsd(amount: string, exchangeRate: string, exchangeType: CurrencyExchangeType): string {
    const value = new Decimal(amount || '0');
    const rate = new Decimal(exchangeRate || '0');
    if (!rate.isFinite() || rate.lte(0)) return '0.0000';
    const valued = exchangeType === 'FROM_USD_MULTIPLY' ? value.div(rate) : value.mul(rate);
    return valued.toFixed(BalanceValuationService.SCALE);
  }

  /** صافي الرصيد = ΣUS − ΣTHEM (الموجب لنا، السالب علينا). */
  net(totalUs: string, totalThem: string): string {
    return new Decimal(totalUs || '0').minus(totalThem || '0').toFixed(BalanceValuationService.SCALE);
  }

  sum(values: Iterable<string>): string {
    let acc = new Decimal(0);
    for (const v of values) acc = acc.plus(v || '0');
    return acc.toFixed(BalanceValuationService.SCALE);
  }
}
