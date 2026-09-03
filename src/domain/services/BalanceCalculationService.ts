import { Decimal } from 'decimal.js';
import { EntrySide } from '../enums/EntrySide.js';
export interface BalanceLine {
  amount: string;
  side: EntrySide;
  fees?: string;
}
export class BalanceCalculationService {
  calculate(lines: readonly BalanceLine[], opening = '0'): string {
    return lines
      .reduce((balance, line) => {
        const amount = new Decimal(line.amount).add(line.fees ?? '0');
        return line.side === EntrySide.US ? balance.add(amount) : balance.sub(amount);
      }, new Decimal(opening))
      .toFixed(4);
  }
}
