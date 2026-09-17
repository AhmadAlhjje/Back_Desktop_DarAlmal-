import { describe, expect, it, vi } from 'vitest';
import { CreateTransfer } from '../../src/application/use-cases/movements/CreateTransfer.js';

/** أرقام الحركات متسلسلة (1، 2، 3…) تأتي من المستودع لا من مولّد عشوائي. */
describe('sequential movement numbers', () => {
  it('uses the repository sequence for both the id and the movement number', async () => {
    const create = vi.fn(async (x: any) => ({ ...x }));
    const nextNumber = vi.fn().mockResolvedValue('4');
    const repos: any = {
      movementTypeRepository: { findByCode: vi.fn().mockResolvedValue({ id: '1', isActive: true }) },
      clientRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      currencyRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      movementRepository: { nextNumber, create },
      transferRepository: { create: vi.fn(async (x: any) => x) },
      journalRepository: { createMany: vi.fn() },
    };
    const uow: any = { execute: vi.fn(async (work: any) => work(repos)) };
    await new CreateTransfer(uow, { now: () => new Date('2026-09-17T10:00:00Z') }).execute({
      transferAmount: '100',
      transferCurrencyId: '1',
      fromClientId: '1',
      fromCurrencyId: '1',
      fromExchangeRate: '1',
      toClientId: '2',
      toCurrencyId: '1',
      toExchangeRate: '1',
      createdBy: '1',
    });
    expect(nextNumber).toHaveBeenCalledOnce();
    const header = create.mock.calls[0][0];
    expect(header.id).toBe('4');
    expect(header.movementNo).toBe('4');
    // رقم قصير مقروء لا معرّف ضخم.
    expect(header.movementNo.length).toBeLessThanOrEqual(6);
  });
});
