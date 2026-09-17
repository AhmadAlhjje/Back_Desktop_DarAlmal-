import { describe, expect, it, vi } from 'vitest';
import { CreateTransfer } from '../../src/application/use-cases/movements/CreateTransfer.js';
import { CreateReceiptPayment } from '../../src/application/use-cases/movements/CreateReceiptPayment.js';
import { ReceiptPaymentType } from '../../src/domain/enums/ReceiptPaymentType.js';
import { MovementStatus } from '../../src/domain/enums/MovementStatus.js';
import { diffDescriptions, formatChanges } from '../../src/application/use-cases/movements/helpers.js';

const clock = { now: () => new Date('2026-01-05T10:00:00Z') };
const names: Record<string, string> = { '10': 'أحمد', '25': 'باسل', '30': 'كريم' };
const currencies: Record<string, string> = { '1': 'دولار', '2': 'يورو' };

function transferRepos(stored: any) {
  const movement: any = {
    id: '77',
    movementNo: '77',
    movementTypeId: '1',
    clientId: '10',
    description: 'حوالة قديمة',
    movementDate: '2026-01-01',
    movementTime: '09:30:00',
    totalResult: '8.0000000000',
    status: MovementStatus.POSTED,
    createdBy: '1',
    updatedBy: null,
  };
  const repos: any = {
    movementTypeRepository: {
      findByCode: vi.fn().mockResolvedValue({ id: '1', code: 'TRANSFER', isActive: true }),
      findById: vi.fn().mockResolvedValue({ id: '1', code: 'TRANSFER', isActive: true }),
    },
    clientRepository: { findById: vi.fn(async (id: string) => ({ id, fullName: names[id], isActive: true })) },
    currencyRepository: { findById: vi.fn(async (id: string) => ({ id, name: currencies[id], isActive: true })) },
    movementRepository: { nextNumber: vi.fn().mockResolvedValue('7'),
      findById: vi.fn(async () => movement),
      create: vi.fn(),
      clearContents: vi.fn(),
      updateContents: vi.fn(async (_id: string, patch: any) => Object.assign(movement, { description: patch.description, totalResult: patch.totalResult, clientId: patch.clientId, updatedBy: patch.updatedBy })),
    },
    transferRepository: {
      findByMovement: vi.fn(async () => stored.detail),
      create: vi.fn(async (x: any) => {
        stored.detail = x;
        return x;
      }),
    },
    journalRepository: { createMany: vi.fn(async (rows: any) => void (stored.entries = rows)) },
  };
  return { repos, movement };
}

describe('edit movement in place', () => {
  it('rewrites the transfer under the same number, keeps the original date, and reports what changed', async () => {
    const stored: any = {
      detail: {
        movementId: '77',
        statement: 'حوالة قديمة',
        transferAmount: '1000',
        transferCurrencyId: '1',
        fromClientId: '10',
        fromCurrencyId: '1',
        fromExchangeRate: '1',
        feeUs: '10',
        totalUs: '1010',
        toClientId: '25',
        toCurrencyId: '1',
        toExchangeRate: '1',
        feeThem: '2',
        totalThem: '1002',
      },
    };
    const { repos } = transferRepos(stored);
    const uow: any = { execute: vi.fn(async (work: any) => work(repos)) };
    const result = await new CreateTransfer(uow, clock).replace(
      '77',
      {
        statement: 'حوالة معدّلة',
        transferAmount: '1200',
        transferCurrencyId: '1',
        fromClientId: '10',
        fromCurrencyId: '1',
        fromExchangeRate: '1',
        feeUs: '10',
        toClientId: '30',
        toCurrencyId: '1',
        toExchangeRate: '1',
        feeThem: '2',
        createdBy: '9',
      },
      '9',
    );
    expect(repos.movementRepository.create).not.toHaveBeenCalled();
    expect(repos.movementRepository.clearContents).toHaveBeenCalledWith('77');
    // القيود الجديدة تحمل تاريخ/وقت الحركة الأصلية لا وقت التعديل.
    expect(stored.entries.map((e: any) => [e.movementId, e.movementDate, e.movementTime])).toEqual([
      ['77', '2026-01-01', '09:30:00'],
      ['77', '2026-01-01', '09:30:00'],
    ]);
    expect(repos.movementRepository.updateContents).toHaveBeenCalledWith('77', {
      clientId: '10',
      description: 'حوالة معدّلة',
      totalResult: '8.0000000000',
      updatedBy: '9',
    });
    expect(result.movement.movementNo).toBe('77');
    expect(result.changes).toEqual([
      { field: 'المبلغ', from: '1000', to: '1200' },
      { field: 'إلى حساب', from: 'باسل', to: 'كريم' },
      { field: 'البيان', from: 'حوالة قديمة', to: 'حوالة معدّلة' },
    ]);
    expect(formatChanges(result.changes)).toBe('المبلغ: من 1000 إلى 1200؛ إلى حساب: من باسل إلى كريم؛ البيان: من حوالة قديمة إلى حوالة معدّلة');
  });

  it('refuses to edit a movement of another type or a non-posted one', async () => {
    const stored: any = { detail: null };
    const { repos, movement } = transferRepos(stored);
    repos.movementTypeRepository.findById = vi.fn().mockResolvedValue({ id: '6', code: 'EXCHANGE', isActive: true });
    const uow: any = { execute: vi.fn(async (work: any) => work(repos)) };
    const input: any = { transferAmount: '1', transferCurrencyId: '1', fromClientId: '10', fromCurrencyId: '1', fromExchangeRate: '1', toClientId: '25', toCurrencyId: '1', toExchangeRate: '1', createdBy: '9' };
    await expect(new CreateTransfer(uow, clock).replace('77', input, '9')).rejects.toMatchObject({ code: 'MOVEMENT_TYPE_MISMATCH' });
    movement.status = MovementStatus.CANCELLED;
    await expect(new CreateTransfer(uow, clock).replace('77', input, '9')).rejects.toMatchObject({ code: 'MOVEMENT_NOT_POSTED' });
  });

  it('editing a receipt may turn it into a payment and updates the movement type', async () => {
    const stored: any = { detail: { movementId: '5', type: ReceiptPaymentType.RECEIPT, statement: null, clientId: '10', currencyId: '1', amount: '500' } };
    const movement: any = { id: '5', movementNo: '5', movementTypeId: '4', clientId: '10', movementDate: '2026-01-01', movementTime: '08:00:00', totalResult: '-500', status: MovementStatus.POSTED, description: null };
    const repos: any = {
      movementTypeRepository: {
        findByCode: vi.fn(async (code: string) => ({ id: code === 'PAYMENT' ? '5' : '4', code, isActive: true })),
        findById: vi.fn(async (id: string) => ({ id, code: id === '5' ? 'PAYMENT' : 'RECEIPT', isActive: true })),
      },
      clientRepository: { findById: vi.fn(async (id: string) => ({ id, fullName: names[id], isActive: true })) },
      currencyRepository: { findById: vi.fn(async (id: string) => ({ id, name: currencies[id], isActive: true })) },
      movementRepository: { nextNumber: vi.fn().mockResolvedValue('7'),
        findById: vi.fn(async () => movement),
        clearContents: vi.fn(),
        updateContents: vi.fn(async (_id: string, patch: any) => Object.assign(movement, patch)),
      },
      receiptPaymentRepository: {
        findByMovement: vi.fn(async () => stored.detail),
        create: vi.fn(async (x: any) => (stored.detail = x)),
      },
      journalRepository: { createMany: vi.fn() },
    };
    const uow: any = { execute: vi.fn(async (work: any) => work(repos)) };
    const result = await new CreateReceiptPayment(uow, clock).replace(
      '5',
      { type: ReceiptPaymentType.PAYMENT, clientId: '10', currencyId: '1', amount: '600', createdBy: '9' },
      '9',
    );
    expect(repos.movementRepository.updateContents.mock.calls[0][1]).toMatchObject({ movementTypeId: '5', totalResult: '600' });
    expect(result.changes).toEqual(
      expect.arrayContaining([
        { field: 'النوع', from: 'سند قبض', to: 'سند دفع' },
        { field: 'المبلغ', from: '500', to: '600' },
      ]),
    );
  });

  it('diff ignores unchanged fields and formats missing values', () => {
    expect(diffDescriptions({ a: '1', b: '2' }, { a: '1', b: '3', c: 'x' })).toEqual([
      { field: 'b', from: '2', to: '3' },
      { field: 'c', from: '—', to: 'x' },
    ]);
    expect(formatChanges([])).toBe('بلا تغييرات فعلية');
  });
});
