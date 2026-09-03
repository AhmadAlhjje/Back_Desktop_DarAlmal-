import { Decimal } from 'decimal.js';
import { DomainError } from '../errors/DomainError.js';
export class Percentage {
  private constructor(private readonly value: Decimal) {}
  static of(value: string): Percentage {
    const number = new Decimal(value);
    if (!number.isFinite() || number.lt(0) || number.gt(100))
      throw new DomainError('INVALID_PERCENTAGE', 'Percentage must be between 0 and 100');
    return new Percentage(number);
  }
  ofAmount(amount: string): string {
    return new Decimal(amount).mul(this.value).div(100).toFixed(4);
  }
  toString(): string {
    return this.value.toFixed(4);
  }
}
