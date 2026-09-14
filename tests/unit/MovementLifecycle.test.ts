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
};
describe('movement lifecycle', () => {
  it('cancels by status without deleting financial records', async () => {
    const updateStatus = vi.fn();
    const repos: any = { movementRepository: { findById: vi.fn().mockResolvedValue(original), updateStatus } };
    const result = await new CancelMovement({ execute: (work: any) => work(repos) }).execute('10', '9');
    expect(updateStatus).toHaveBeenCalledWith('10', MovementStatus.CANCELLED, '9');
    expect(result.status).toBe(MovementStatus.CANCELLED);
  });
  it('creates an opposite journal and keeps original entries unchanged', async () => {
    const entries = [
      {
        movementId: '10',
        lineNo: 1,
        clientId: '2',
        currencyId: '1',
        amount: '100',
        side: EntrySide.US,
        exchangeRate: null,
        fees: '0',
        feePercentage: null,
        description: null,
        movementDate: '2026-01-01',
        movementTime: '10:00:00',
      },
      {
        movementId: '10',
        lineNo: 2,
        clientId: '3',
        currencyId: '1',
        amount: '75',
        side: EntrySide.THEM,
        exchangeRate: null,
        fees: '0',
        feePercentage: null,
        description: null,
        movementDate: '2026-01-01',
        movementTime: '10:00:00',
      },
    ];
    const createMany = vi.fn();
    const updateStatus = vi.fn();
    const repos: any = {
      movementRepository: {
        findById: vi.fn().mockResolvedValue(original),
        create: vi.fn(async (x) => ({ ...x, id: x.id })),
        updateStatus,
      },
      journalRepository: { findByMovement: vi.fn().mockResolvedValue(entries), createMany },
    };
    const result = await new ReverseMovement(
      { execute: (work: any) => work(repos) },
      { now: () => new Date('2026-01-02T12:00:00Z') },
    ).execute('10', '9');
    const reversed = createMany.mock.calls[0][0];
    expect(reversed.map((e: any) => e.side)).toEqual([EntrySide.THEM, EntrySide.US]);
    expect(entries.map((e) => e.side)).toEqual([EntrySide.US, EntrySide.THEM]);
    expect(result.reverseMovement.totalResult).toBe('-25.0000000000');
    expect(updateStatus).toHaveBeenCalledWith('10', MovementStatus.REVERSED, '9');
  });
});
