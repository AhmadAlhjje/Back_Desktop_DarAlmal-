import { describe, expect, it } from 'vitest';
import { BalanceCalculationService } from '../../src/domain/services/BalanceCalculationService.js';
import { EntrySide } from '../../src/domain/enums/EntrySide.js';
describe('BalanceCalculationService', () => {
  it('adds US and subtracts THEM deterministically', () =>
    expect(
      new BalanceCalculationService().calculate(
        [
          { amount: '100.10', side: EntrySide.US },
          { amount: '20.05', side: EntrySide.THEM },
        ],
        '5',
      ),
    ).toBe('85.05'));
});
