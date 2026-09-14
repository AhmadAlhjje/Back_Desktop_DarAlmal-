import { Decimal } from 'decimal.js';
import type { Currency } from '../../../domain/entities/Currency.js';
import type { CurrencyRepository } from '../../ports/repositories/CurrencyRepository.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

/** العملة الأساس للتقييم؛ سعرها 1 دائماً ولا يُعدَّل. */
export const BASE_CURRENCY_CODE = 'USD';

/** ما يجوز تعديله في عملة أساسية (قرار المستخدم 2026-09-15): سعر الصرف واتجاهه فقط. */
const SYSTEM_EDITABLE: ReadonlySet<keyof Currency> = new Set<keyof Currency>(['exchangeRate', 'exchangeType']);

export class ManageCurrencies {
  constructor(private currencies: CurrencyRepository) {}
  async list(page: number, limit: number) {
    const r = await this.currencies.findPage(page, limit);
    return { currencies: r.rows, pagination: { page, limit, total: r.count, pages: Math.ceil(r.count / limit) } };
  }
  create(input: Omit<Currency, 'id'>) {
    return this.currencies.create({ ...input, isSystem: false });
  }
  async update(id: string, input: Partial<Omit<Currency, 'id'>>) {
    const current = await this.currencies.findById(id);
    if (!current) throw new ApplicationError('CURRENCY_NOT_FOUND', 'Currency not found', 404);
    if (current.isSystem) this.assertSystemChangeAllowed(current, input);
    const { isSystem: _ignored, ...safe } = input;
    const value = await this.currencies.update(id, safe);
    if (!value) throw new ApplicationError('CURRENCY_NOT_FOUND', 'Currency not found', 404);
    return value;
  }
  async deactivate(id: string) {
    const current = await this.currencies.findById(id);
    if (!current) throw new ApplicationError('CURRENCY_NOT_FOUND', 'Currency not found', 404);
    if (current.isSystem) {
      throw new ApplicationError('SYSTEM_CURRENCY_PROTECTED', 'System currencies cannot be deactivated', 409);
    }
    return this.update(id, { isActive: false });
  }
  /** إعادة تفعيل عملة معطّلة (كل ما يُعطَّل يمكن إعادة تفعيله). */
  activate(id: string) {
    return this.update(id, { isActive: true });
  }

  /** يرفض أي تغيير فعلي في عملة أساسية خارج سعر الصرف؛ القيم المطابقة للحالية لا تُعدّ تغييراً. */
  private assertSystemChangeAllowed(current: Currency, input: Partial<Omit<Currency, 'id'>>) {
    for (const [key, value] of Object.entries(input) as [keyof Currency, unknown][]) {
      if (value === undefined) continue;
      const unchanged = key === 'exchangeRate'
        ? new Decimal(String(value)).eq(current.exchangeRate)
        : value === current[key];
      if (unchanged) continue;
      if (!SYSTEM_EDITABLE.has(key)) {
        throw new ApplicationError('SYSTEM_CURRENCY_PROTECTED', `System currencies only allow changing the exchange rate (field: ${key})`, 409);
      }
      if (current.code === BASE_CURRENCY_CODE) {
        throw new ApplicationError('SYSTEM_CURRENCY_PROTECTED', 'The base currency (USD) rate is always 1', 409);
      }
    }
  }
}
