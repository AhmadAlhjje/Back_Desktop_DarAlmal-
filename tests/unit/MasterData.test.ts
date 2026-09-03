import { describe, expect, it, vi } from 'vitest';
import { ManageCurrencies } from '../../src/application/use-cases/currencies/ManageCurrencies.js';
describe('master data lifecycle', () => {
  it('deactivates currencies instead of deleting them', async () => {
    const update = vi.fn().mockResolvedValue({ id: '1', isActive: false });
    await new ManageCurrencies({ update } as any).deactivate('1');
    expect(update).toHaveBeenCalledWith('1', { isActive: false });
  });
});
