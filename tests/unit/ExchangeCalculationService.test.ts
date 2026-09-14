import { describe, expect, it } from 'vitest';
import { ExchangeCalculationService } from '../../src/domain/services/ExchangeCalculationService.js';

describe('ExchangeCalculationService', () => {
  it('derives THEM from the received amount and US from the delivered amount', () => {
    expect(new ExchangeCalculationService().calculate('1000', '12500000', '12500')).toEqual({
      totalUs: '12500000.0000000000',
      totalThem: '1000.0000000000',
      profitLoss: '0.0000000000',
    });
  });
});
