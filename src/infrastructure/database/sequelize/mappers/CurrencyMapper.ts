import type { Currency } from '../../../../domain/entities/Currency.js';
import type { CurrencyModel } from '../models/CurrencyModel.js';
export const CurrencyMapper = {
  toDomain(m: CurrencyModel): Currency {
    return {
      id: m.id_currency,
      name: m.currency_name,
      code: m.currency_code,
      symbol: m.currency_symbol,
      decimalPlaces: m.decimal_places,
      iconPath: m.icon_path,
      textIcon: m.text_icon,
      importance: m.importance,
      exchangeRate: m.exchange_rate,
      exchangeType: m.exchange_type,
      isActive: m.is_active,
    };
  },
};
