import { describe, expect, it, vi } from 'vitest';
import { CreateJournalMovement } from '../../src/application/use-cases/movements/CreateJournalMovement.js';
import { EntrySide } from '../../src/domain/enums/EntrySide.js';
describe('CreateJournalMovement', () => {
  it('validates source entries and creates header and journal atomically', async () => {
    const createMany = vi.fn();
    const repos: any = {
      movementTypeRepository: { findByCode: vi.fn().mockResolvedValue({ id: '3', isActive: true }) },
      clientRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      currencyRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      movementRepository: { nextNumber: vi.fn().mockResolvedValue('7'), create: vi.fn(async (x) => ({ id: x.id, ...x })) },
      journalRepository: { createMany },
    };
    const uow: any = { execute: vi.fn((work) => work(repos)) };
    await new CreateJournalMovement(uow, { now: () => new Date('2026-01-01T12:00:00Z') }).execute({
      movementCode: 'MULTI',
      createdBy: '1',
      entries: [
        { clientId: '10', currencyId: '1', amount: '50.25', side: EntrySide.US },
        { clientId: '11', currencyId: '1', amount: '50.25', side: EntrySide.THEM },
      ],
    });
    expect(createMany).toHaveBeenCalledOnce();
    expect(createMany.mock.calls[0][0]).toHaveLength(2);
  });
});
