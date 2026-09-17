import { describe, expect, it, vi } from 'vitest';
import { CreateTransfer } from '../../src/application/use-cases/movements/CreateTransfer.js';
describe('CreateTransfer', () => {
  it('uses one UnitOfWork and propagates detail failure for rollback', async () => {
    const movementCreate = vi.fn().mockResolvedValue({ id: '1' });
    const journalCreate = vi.fn();
    const repos: any = {
      movementTypeRepository: { findByCode: vi.fn().mockResolvedValue({ id: '1', isActive: true }) },
      clientRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      currencyRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      movementRepository: { nextNumber: vi.fn().mockResolvedValue('7'), create: movementCreate },
      transferRepository: { create: vi.fn().mockRejectedValue(new Error('detail failed')) },
      journalRepository: { createMany: journalCreate },
    };
    const uow: any = { execute: vi.fn(async (work) => work(repos)) };
    const useCase = new CreateTransfer(uow, { now: () => new Date('2026-01-01T10:00:00Z') });
    await expect(
      useCase.execute({
        transferAmount: '10',
        transferCurrencyId: '1',
        fromClientId: '1',
        fromCurrencyId: '1',
        fromExchangeRate: '1',
        toClientId: '2',
        toCurrencyId: '1',
        toExchangeRate: '1',
        createdBy: '1',
      }),
    ).rejects.toThrow('detail failed');
    expect(uow.execute).toHaveBeenCalledOnce();
    expect(movementCreate).toHaveBeenCalledOnce();
    expect(journalCreate).not.toHaveBeenCalled();
  });
  it('derives FROM=US (لنا على من حساب) and TO=THEM (علينا لصالح إلى حساب)', async () => {
    const journalCreate = vi.fn();
    const repos: any = {
      movementTypeRepository: { findByCode: vi.fn().mockResolvedValue({ id: '1', isActive: true }) },
      clientRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      currencyRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      movementRepository: { nextNumber: vi.fn().mockResolvedValue('7'), create: vi.fn(async (x) => ({ ...x })) },
      transferRepository: { create: vi.fn(async (x) => x) },
      journalRepository: { createMany: journalCreate },
    };
    const uow: any = { execute: vi.fn(async (work) => work(repos)) };
    await new CreateTransfer(uow, { now: () => new Date('2026-01-01T10:00:00Z') }).execute({
      transferAmount: '1000',
      transferCurrencyId: '1',
      fromClientId: '10',
      fromCurrencyId: '1',
      fromExchangeRate: '1',
      feeUs: '10',
      toClientId: '25',
      toCurrencyId: '1',
      toExchangeRate: '1',
      feeThem: '2',
      createdBy: '1',
    });
    const lines = journalCreate.mock.calls[0][0];
    expect(lines.map((x: any) => [x.clientId, x.side, x.amount])).toEqual([
      ['10', 'US', '1010.0000000000'],
      ['25', 'THEM', '1002.0000000000'],
    ]);
  });
});
