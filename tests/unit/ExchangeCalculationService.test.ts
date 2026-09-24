import { describe, expect, it } from 'vitest';
import { ExchangeCalculationService } from '../../src/domain/services/ExchangeCalculationService.js';

describe('ExchangeCalculationService', () => {
  it('derives THEM from the received amount and US from the delivered amount', () => {
    expect(new ExchangeCalculationService().calculate('1000', '12500000', '12500')).toEqual({
      totalUs: '12500000.00',
      totalThem: '1000.00',
      profitLoss: '0.00',
    });
  });
});
