import { describe, expect, it } from 'vitest';
import { BalanceValuationService } from '../../src/domain/services/BalanceValuationService.js';
import { GetBalanceSheet } from '../../src/application/use-cases/reports/GetBalanceSheet.js';
import type { BalanceAggregateRow } from '../../src/application/ports/repositories/ReportsRepository.js';

const svc = new BalanceValuationService();
const row = (o: Partial<BalanceAggregateRow>): BalanceAggregateRow => ({
  clientId: '1',
  clientName: 'A',
  clientCode: 'A',
  currencyId: '1',
  currencyCode: 'USD',
  currencyName: 'USD',
  currencySymbol: null,
  decimalPlaces: 2,
  exchangeRate: '1',
  exchangeType: 'FROM_USD_MULTIPLY',
  totalUs: '0',
  totalThem: '0',
  ...o,
});

describe('BalanceValuationService', () => {
  it('values FROM_USD_MULTIPLY by division and TO_USD_DIVIDE by multiplication', () => {
    expect(svc.toUsd('47950', '47.95', 'FROM_USD_MULTIPLY')).toBe('1000.0000000000');
    expect(svc.toUsd('1000', '1.135', 'TO_USD_DIVIDE')).toBe('1135.0000000000');
    expect(svc.toUsd('-13513', '13513', 'FROM_USD_MULTIPLY')).toBe('-1.0000000000');
  });
  it('rejects non-positive rates safely', () => {
    expect(svc.toUsd('100', '0', 'FROM_USD_MULTIPLY')).toBe('0.0000000000');
  });
  // قرار المستخدم 2026-09-17: سعر الدولار نفسه قابل للتعديل، والتقييم يستعمله كأي عملة أخرى.
  it('values USD by its own stored rate, never assuming 1', () => {
    expect(svc.toUsd('100', '2', 'FROM_USD_MULTIPLY')).toBe('50.0000000000');
    expect(svc.toUsd('100', '1.25', 'TO_USD_DIVIDE')).toBe('125.0000000000');
  });
  it('net = us - them with 4 decimals', () => {
    expect(svc.net('1010', '1002')).toBe('8.0000000000');
    expect(svc.net('0', '3200')).toBe('-3200.0000000000');
  });
});

describe('GetBalanceSheet', () => {
  const rows: BalanceAggregateRow[] = [
    row({ clientId: '1', clientName: 'A', totalUs: '1010', totalThem: '0' }),
    row({ clientId: '2', clientName: 'B', totalUs: '0', totalThem: '1002' }),
    row({ clientId: '2', clientName: 'B', currencyId: '2', currencyCode: 'TRY', currencyName: 'TRY', exchangeRate: '40', totalUs: '4000', totalThem: '0' }),
    row({ clientId: '3', clientName: 'C', totalUs: '5', totalThem: '5' }),
  ];
  const reports = { allBalances: async () => rows } as never;
  it('valued/simple aggregates per client in USD and hides balanced accounts', async () => {
    const r = await new GetBalanceSheet(reports).execute({ mode: 'valued', detail: 'simple' });
    expect(r.rows.map((x) => x.client.fullName)).toEqual(['A', 'B']);
    const b = r.rows[1];
    expect(b.totalUs).toBe('100.0000000000'); // 4000 TRY / 40
    expect(b.totalThem).toBe('1002.0000000000');
    expect(b.balanceThem).toBe('902.0000000000');
    expect(r.totals.difference).toBe('108.0000000000'); // 1010 - 902
  });
  it('a USD rate other than 1 changes the valued totals', async () => {
    const usdAtTwo: BalanceAggregateRow[] = [row({ clientId: '1', clientName: 'A', exchangeRate: '2', totalUs: '1000', totalThem: '0' })];
    const r = await new GetBalanceSheet({ allBalances: async () => usdAtTwo } as never).execute({ mode: 'valued', detail: 'simple' });
    expect(r.rows[0].totalUs).toBe('500.0000000000'); // 1000 ÷ 2 وليس 1000
  });
  it('currency/full keeps one row per currency including balanced ones', async () => {
    const r = await new GetBalanceSheet(reports).execute({ mode: 'currency', detail: 'full' });
    expect(r.rows).toHaveLength(4);
    expect(r.rows[2].currency?.code).toBe('TRY');
    expect(r.rows[2].balanceUs).toBe('4000.0000000000');
  });
});
