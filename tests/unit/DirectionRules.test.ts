import { describe, expect, it, vi } from 'vitest';
import { CreateReceiptPayment } from '../../src/application/use-cases/movements/CreateReceiptPayment.js';
import { CreateExchange } from '../../src/application/use-cases/movements/CreateExchange.js';
import { ReceiptPaymentType } from '../../src/domain/enums/ReceiptPaymentType.js';
import { EntrySide } from '../../src/domain/enums/EntrySide.js';
const clock = { now: () => new Date('2026-01-01T10:00:00Z') };
function repos() {
  const journal = vi.fn();
  return {
    journal,
    value: {
      movementTypeRepository: { findByCode: vi.fn().mockResolvedValue({ id: '1', isActive: true }) },
      clientRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      currencyRepository: { findById: vi.fn().mockResolvedValue({ isActive: true }) },
      movementRepository: { create: vi.fn(async (x) => ({ ...x, id: x.id })) },
      receiptPaymentRepository: { create: vi.fn(async (x) => x) },
      exchangeRepository: { create: vi.fn(async (x) => x) },
      journalRepository: { createMany: journal },
    },
  };
}
describe('locked direction rules', () => {
  it.each([
    [ReceiptPaymentType.RECEIPT, EntrySide.THEM],
    [ReceiptPaymentType.PAYMENT, EntrySide.US],
  ])('%s derives %s', async (type, side) => {
    const r = repos();
    await new CreateReceiptPayment({ execute: (work: any) => work(r.value) }, clock).execute({
      type,
      clientId: '1',
      currencyId: '1',
      amount: '300',
      createdBy: '1',
    });
    expect(r.journal.mock.calls[0][0][0].side).toBe(side);
  });
  it('derives exchange FROM=THEM and TO=US', async () => {
    const r = repos();
    await new CreateExchange({ execute: (work: any) => work(r.value) }, clock).execute({
      clientId: '1',
      fromCurrencyId: '1',
      fromAmount: '1000',
      toCurrencyId: '2',
      toAmount: '12500000',
      exchangeRate: '12500',
      createdBy: '1',
    });
    const lines = r.journal.mock.calls[0][0];
    expect(lines.map((x: any) => x.side)).toEqual([EntrySide.THEM, EntrySide.US]);
    expect(r.value.exchangeRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalUs: '12500000.0000', totalThem: '1000.0000', profitLoss: '0.0000' }),
    );
  });
});
