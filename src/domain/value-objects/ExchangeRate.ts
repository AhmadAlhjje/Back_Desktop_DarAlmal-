import { Decimal } from 'decimal.js';
import { InvalidExchangeRateError } from '../errors/InvalidExchangeRateError.js';
export class ExchangeRate {
  private constructor(private readonly value: Decimal) {}
  static of(value: string): ExchangeRate {
    try {
      const rate = new Decimal(value);
      if (!rate.isFinite() || !rate.gt(0)) throw new Error();
      return new ExchangeRate(rate);
    } catch {
      throw new InvalidExchangeRateError();
    }
  }
  apply(amount: string): string {
    return new Decimal(amount).mul(this.value).toFixed(4);
  }
  toString(): string {
    return this.value.toFixed(8);
  }
}
