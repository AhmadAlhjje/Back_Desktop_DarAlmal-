import { describe, expect, it, vi } from 'vitest';
import { ManageCurrencies } from '../../src/application/use-cases/currencies/ManageCurrencies.js';
import type { Currency } from '../../src/domain/entities/Currency.js';

const system = (over: Partial<Currency> = {}): Currency => ({
  id: '2',
  name: 'ليرة سوري',
  code: 'SYP',
  symbol: 'ل.س',
  decimalPlaces: 2,
  iconPath: null,
  textIcon: 'SY',
  importance: 99999,
  exchangeRate: '13150.0000000000',
  exchangeType: 'FROM_USD_MULTIPLY',
  isActive: true,
  isSystem: true,
  ...over,
});

function make(current: Currency) {
  const repo = {
    findById: vi.fn().mockResolvedValue(current),
    findPage: vi.fn(),
    findAll: vi.fn(async () => [current]),
    create: vi.fn(async (i: Omit<Currency, 'id'>) => ({ id: '9', ...i })),
    update: vi.fn(async (_id: string, i: Partial<Currency>) => ({ ...current, ...i })),
  };
  return { repo, m: new ManageCurrencies(repo) };
}

describe('ManageCurrencies — system currencies', () => {
  it('allows changing only the exchange rate of a system currency', async () => {
    const { repo, m } = make(system());
    await m.update('2', { exchangeRate: '14000', exchangeType: 'FROM_USD_MULTIPLY' });
    expect(repo.update).toHaveBeenCalledWith('2', { exchangeRate: '14000', exchangeType: 'FROM_USD_MULTIPLY' });
  });

  it('rejects renaming / recoding / re-flagging a system currency', async () => {
    const { m } = make(system());
    await expect(m.update('2', { name: 'ليرة' })).rejects.toMatchObject({ code: 'SYSTEM_CURRENCY_PROTECTED' });
    await expect(m.update('2', { code: 'SYX' })).rejects.toMatchObject({ code: 'SYSTEM_CURRENCY_PROTECTED' });
    await expect(m.update('2', { textIcon: 'TR' })).rejects.toMatchObject({ code: 'SYSTEM_CURRENCY_PROTECTED' });
    await expect(m.update('2', { isActive: false })).rejects.toMatchObject({ code: 'SYSTEM_CURRENCY_PROTECTED' });
  });

  it('ignores unchanged protected fields sent along with a new rate', async () => {
    const { repo, m } = make(system());
    await m.update('2', { name: 'ليرة سوري', code: 'SYP', textIcon: 'SY', exchangeRate: '13200.00' });
    expect(repo.update).toHaveBeenCalled();
  });

  it('allows editing the USD rate too (it is valued by its own rate, not assumed to be 1)', async () => {
    const { repo, m } = make(system({ id: '1', code: 'USD', name: 'دولار', exchangeRate: '1.0000000000' }));
    await expect(m.update('1', { exchangeRate: '1.02' })).resolves.toBeTruthy();
    expect(repo.update).toHaveBeenCalledWith('1', { exchangeRate: '1.02' });
    // الاسم والرمز يبقيان مقفلين حتى في الدولار.
    await expect(m.update('1', { name: 'دولار أمريكي' })).rejects.toMatchObject({ code: 'SYSTEM_CURRENCY_PROTECTED' });
  });

  it('never deactivates a system currency, and created currencies are never system', async () => {
    const { repo, m } = make(system());
    await expect(m.deactivate('2')).rejects.toMatchObject({ code: 'SYSTEM_CURRENCY_PROTECTED' });
    await m.create({ ...system(), isSystem: true });
    expect(repo.create.mock.calls[0][0].isSystem).toBe(false);
  });

  it('leaves ordinary currencies fully editable', async () => {
    const { repo, m } = make(system({ id: '5', code: 'SAR', isSystem: false }));
    await m.update('5', { name: 'ريال', code: 'SAR2', isActive: false });
    expect(repo.update).toHaveBeenCalledWith('5', { name: 'ريال', code: 'SAR2', isActive: false });
    await expect(m.deactivate('5')).resolves.toBeTruthy();
  });
});
