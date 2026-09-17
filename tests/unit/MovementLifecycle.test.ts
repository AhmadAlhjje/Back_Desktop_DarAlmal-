import { describe, expect, it, vi } from 'vitest';
import { CancelMovement } from '../../src/application/use-cases/movements/CancelMovement.js';
import { ReverseMovement } from '../../src/application/use-cases/movements/ReverseMovement.js';
import { MovementStatus } from '../../src/domain/enums/MovementStatus.js';
import { EntrySide } from '../../src/domain/enums/EntrySide.js';
const original: any = {
  id: '10',
  movementNo: '10',
  movementTypeId: '1',
  clientId: '2',
  description: null,
  movementDate: '2026-01-01',
  movementTime: '10:00:00',
  totalResult: '25.0000000000',
  status: MovementStatus.POSTED,
  createdBy: '1',
  updatedBy: null,
  reversedAt: null,
};
const entries = [
  { movementId: '10', lineNo: 1, clientId: '2', currencyId: '1', amount: '100', side: EntrySide.US },
  { movementId: '10', lineNo: 2, clientId: '3', currencyId: '1', amount: '75', side: EntrySide.THEM },
];
const clock = { now: () => new Date('2026-01-02T12:00:00Z') };

function reverseRepos(typeCode: string, over: Record<string, unknown> = {}) {
  const repos: any = {
    movementRepository: { nextNumber: vi.fn().mockResolvedValue('7'),
      findById: vi.fn().mockResolvedValue(original),
      updateContents: vi.fn(),
    },
    journalRepository: { findByMovement: vi.fn().mockResolvedValue(entries), flipSides: vi.fn() },
    movementTypeRepository: {
      findById: vi.fn().mockResolvedValue({ id: '1', code: typeCode, isActive: true }),
      findByCode: vi.fn(async (code: string) => ({ id: code === 'PAYMENT' ? '5' : '4', code, isActive: true })),
    },
    transferRepository: { swapSides: vi.fn(), findByMovement: vi.fn().mockResolvedValue({ fromClientId: '3', toClientId: '2' }) },
    exchangeRepository: { swapSides: vi.fn() },
    receiptPaymentRepository: { setType: vi.fn() },
    ...over,
  };
  return repos;
}

describe('movement lifecycle', () => {
  it('cancels by status without deleting financial records', async () => {
    const updateStatus = vi.fn();
    const repos: any = { movementRepository: { nextNumber: vi.fn().mockResolvedValue('7'), findById: vi.fn().mockResolvedValue(original), updateStatus } };
    const result = await new CancelMovement({ execute: (work: any) => work(repos) }).execute('10', '9');
    expect(updateStatus).toHaveBeenCalledWith('10', MovementStatus.CANCELLED, '9');
    expect(result.status).toBe(MovementStatus.CANCELLED);
  });

  it('reverses a transfer in place: flips entries, swaps sides, negates the result, keeps the number', async () => {
    const repos = reverseRepos('TRANSFER');
    const result = await new ReverseMovement({ execute: (work: any) => work(repos) }, clock).execute('10', '9');
    expect(repos.journalRepository.flipSides).toHaveBeenCalledWith('10');
    expect(repos.transferRepository.swapSides).toHaveBeenCalledWith('10');
    expect(repos.movementRepository.updateContents).toHaveBeenCalledWith('10', {
      movementTypeId: '1',
      clientId: '3',
      totalResult: '-25.0000000000',
      updatedBy: '9',
      reversedAt: clock.now(),
      reversedBy: '9',
    });
    expect(result.reversed).toBe(true);
    expect(result.movement.movementNo).toBe('10');
  });

  it('reversing a receipt turns it into a payment (type + kind)', async () => {
    const repos = reverseRepos('RECEIPT');
    await new ReverseMovement({ execute: (work: any) => work(repos) }, clock).execute('10', '9');
    expect(repos.receiptPaymentRepository.setType).toHaveBeenCalledWith('10', 'PAYMENT');
    expect(repos.movementRepository.updateContents.mock.calls[0][1].movementTypeId).toBe('5');
  });

  it('reversing an already reversed movement restores it (flag cleared)', async () => {
    const repos = reverseRepos('EXCHANGE', {
      movementRepository: { nextNumber: vi.fn().mockResolvedValue('7'),
        findById: vi.fn().mockResolvedValue({ ...original, reversedAt: '2026-01-01T00:00:00.000Z' }),
        updateContents: vi.fn(),
      },
    });
    const result = await new ReverseMovement({ execute: (work: any) => work(repos) }, clock).execute('10', '9');
    expect(repos.exchangeRepository.swapSides).toHaveBeenCalledWith('10');
    expect(repos.movementRepository.updateContents.mock.calls[0][1]).toMatchObject({ reversedAt: null, reversedBy: null });
    expect(result.reversed).toBe(false);
  });

  it('refuses to reverse a cancelled movement', async () => {
    const repos = reverseRepos('TRANSFER', {
      movementRepository: { nextNumber: vi.fn().mockResolvedValue('7'), findById: vi.fn().mockResolvedValue({ ...original, status: MovementStatus.CANCELLED }), updateContents: vi.fn() },
    });
    await expect(new ReverseMovement({ execute: (work: any) => work(repos) }, clock).execute('10', '9')).rejects.toMatchObject({
      code: 'MOVEMENT_NOT_POSTED',
    });
  });
});
