import { Decimal } from 'decimal.js';
import { Money } from '../value-objects/Money.js';
import { ExchangeRate } from '../value-objects/ExchangeRate.js';
import { AMOUNT_SCALE } from '../value-objects/Precision.js';

export interface TransferCalculationInput {
  amount: string;
  fromExchangeRate: string;
  toExchangeRate: string;
  feeUs?: string;
  feeThem?: string;
}
export class TransferCalculationService {
  calculate(input: TransferCalculationInput): { totalUs: string; totalThem: string; result: string } {
    const amount = Money.positive(input.amount);
    const us = Money.of(ExchangeRate.of(input.fromExchangeRate).apply(amount.toString())).add(
      Money.of(input.feeUs ?? '0'),
    );
    const them = Money.of(ExchangeRate.of(input.toExchangeRate).apply(amount.toString())).add(
      Money.of(input.feeThem ?? '0'),
    );
    return {
      totalUs: us.toString(),
      totalThem: them.toString(),
      result: new Decimal(us.toString()).minus(them.toString()).toFixed(AMOUNT_SCALE),
    };
  }
}
