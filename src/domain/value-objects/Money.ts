import { Decimal } from 'decimal.js';
import { InvalidAmountError } from '../errors/InvalidAmountError.js';

export class Money {
  private constructor(private readonly value: Decimal) {}
  static zero(): Money {
    return new Money(new Decimal(0));
  }
  static of(value: string): Money {
    try {
      const amount = new Decimal(value);
      if (!amount.isFinite()) throw new Error();
      return new Money(amount);
    } catch {
      throw new InvalidAmountError();
    }
  }
  static positive(value: string): Money {
    const money = Money.of(value);
    if (!money.value.gt(0)) throw new InvalidAmountError();
    return money;
  }
  add(other: Money): Money {
    return new Money(this.value.add(other.value));
  }
  subtract(other: Money): Money {
    return new Money(this.value.sub(other.value));
  }
  multiply(value: Decimal.Value): Money {
    return new Money(this.value.mul(value));
  }
  divide(value: Decimal.Value): Money {
    return new Money(this.value.div(value));
  }
  isNegative(): boolean {
    return this.value.isNegative();
  }
  abs(): Money {
    return new Money(this.value.abs());
  }
  equals(other: Money): boolean {
    return this.value.equals(other.value);
  }
  toString(scale = 4): string {
    return this.value.toFixed(scale);
  }
}
