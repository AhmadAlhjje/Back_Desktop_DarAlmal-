import { Decimal } from 'decimal.js';
import { Money } from '../value-objects/Money.js';
import { ExchangeRate } from '../value-objects/ExchangeRate.js';
import { AMOUNT_SCALE } from '../value-objects/Precision.js';
export class ExchangeCalculationService {
  calculate(
    fromAmount: string,
    toAmount: string,
    rate: string,
  ): { totalUs: string; totalThem: string; profitLoss: string } {
    const source = Money.positive(fromAmount);
    const target = Money.positive(toAmount);
    const exchangeRate = ExchangeRate.of(rate);
    const valuedTargetInSourceCurrency = new Decimal(target.toString()).div(exchangeRate.toString());
    return {
      totalUs: target.toString(),
      totalThem: source.toString(),
      profitLoss: new Decimal(source.toString()).minus(valuedTargetInSourceCurrency).toFixed(AMOUNT_SCALE),
    };
  }
}
