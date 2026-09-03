import type { Currency } from '../../../domain/entities/Currency.js';
import type { CurrencyRepository } from '../../ports/repositories/CurrencyRepository.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
export class ManageCurrencies {
  constructor(private currencies: CurrencyRepository) {}
  async list(page: number, limit: number) {
    const r = await this.currencies.findPage(page, limit);
    return { currencies: r.rows, pagination: { page, limit, total: r.count, pages: Math.ceil(r.count / limit) } };
  }
  create(input: Omit<Currency, 'id'>) {
    return this.currencies.create(input);
  }
  async update(id: string, input: Partial<Omit<Currency, 'id'>>) {
    const value = await this.currencies.update(id, input);
    if (!value) throw new ApplicationError('CURRENCY_NOT_FOUND', 'Currency not found', 404);
    return value;
  }
  deactivate(id: string) {
    return this.update(id, { isActive: false });
  }
}
