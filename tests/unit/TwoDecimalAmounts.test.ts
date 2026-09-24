import { describe, expect, it } from 'vitest';
import { AMOUNT_SCALE, RATE_SCALE, ZERO_AMOUNT, toAmount } from '../../src/domain/value-objects/Precision.js';
import { Money } from '../../src/domain/value-objects/Money.js';
import { ExchangeRate } from '../../src/domain/value-objects/ExchangeRate.js';
import { BalanceCalculationService } from '../../src/domain/services/BalanceCalculationService.js';
import { createTransferSchema } from '../../src/presentation/http/validators/transferSchemas.js';
import { receiptPaymentSchema } from '../../src/presentation/http/validators/receiptPaymentSchemas.js';
import { exchangeSchema } from '../../src/presentation/http/validators/exchangeSchemas.js';
import { createJournalMovementSchema } from '../../src/presentation/http/validators/journalMovementSchemas.js';

/**
 * المبالغ بمنزلتين عشريتين في كل النظام (قرار المستخدم 2026-09-24): كل مبلغ يدخل أو يُحسب أو
 * يُخزَّن يُقرَّب إلى منزلتين. أسعار الصرف وحدها تبقى بدقّتها (معامِل لا مبلغ).
 */
describe('two-decimal amounts', () => {
  it('the scale is two for amounts and stays ten for rates', () => {
    expect(AMOUNT_SCALE).toBe(2);
    expect(RATE_SCALE).toBe(10);
    expect(ZERO_AMOUNT).toBe('0.00');
  });

  it('rounds any incoming amount to two decimals (half-up on the cent)', () => {
    expect(toAmount('5')).toBe('5.00');
    expect(toAmount('5.126')).toBe('5.13');
    expect(toAmount('5.124')).toBe('5.12');
    expect(toAmount('0.0001')).toBe('0.00');
  });

  it('computed amounts come back with two decimals', () => {
    expect(Money.of('0.1').add(Money.of('0.2')).toString()).toBe('0.30');
    expect(
      new BalanceCalculationService().calculate([
        { amount: '100.005', fees: '0', side: 'US' },
        { amount: '10.004', fees: '0', side: 'THEM' },
      ] as never),
    ).toBe('90.00');
    // سعر الصرف يبقى كاملاً، لكنّ ناتج تطبيقه مبلغ بمنزلتين
    expect(ExchangeRate.of('0.0000666').toString()).toBe('0.0000666000');
    expect(ExchangeRate.of('0.0000666').apply('1000000')).toBe('66.60');
  });

  it('every movement endpoint rounds the amounts it receives, and keeps the rate intact', () => {
    const transfer = createTransferSchema.parse({
      transferAmount: '1000.129',
      transferCurrencyId: '1',
      fromClientId: '1',
      fromCurrencyId: '1',
      fromExchangeRate: '0.0000666',
      feeUs: '1.005',
      toClientId: '2',
      toCurrencyId: '1',
      toExchangeRate: '1',
      feeThem: '2.999',
    });
    expect(transfer.transferAmount).toBe('1000.13');
    expect(transfer.feeUs).toBe('1.01');
    expect(transfer.feeThem).toBe('3.00');
    expect(transfer.fromExchangeRate).toBe('0.0000666');

    expect(receiptPaymentSchema.parse({ clientId: '1', currencyId: '1', amount: '10.567' }).amount).toBe('10.57');

    const exchange = exchangeSchema.parse({
      clientId: '1',
      fromCurrencyId: '1',
      fromAmount: '100.999',
      toCurrencyId: '2',
      toAmount: '1.4567',
      exchangeRate: '12500.5555555',
    });
    expect(exchange.fromAmount).toBe('101.00');
    expect(exchange.toAmount).toBe('1.46');
    expect(exchange.exchangeRate).toBe('12500.5555555');

    const journal = createJournalMovementSchema.parse({
      entries: [{ clientId: '1', currencyId: '1', amount: '7.005', side: 'US', fees: '0.004' }],
    });
    expect(journal.entries[0].amount).toBe('7.01');
    expect(journal.entries[0].fees).toBe('0.00');
  });
});
