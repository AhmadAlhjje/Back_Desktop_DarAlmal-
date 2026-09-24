import { describe, expect, it } from 'vitest';
import { TransferCalculationService } from '../../src/domain/services/TransferCalculationService.js';
describe('TransferCalculationService', () => {
  it('calculates both sides and result with Decimal', () =>
    expect(
      new TransferCalculationService().calculate({
        amount: '1000',
        fromExchangeRate: '1',
        toExchangeRate: '0.9',
        feeUs: '10',
        feeThem: '2',
      }),
    ).toEqual({ totalUs: '1010.00', totalThem: '902.00', result: '108.00' }));
});
