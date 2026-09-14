import { z } from 'zod';
import { DECIMAL_PATTERN } from '../../../domain/value-objects/Precision.js';
const id = z.string().regex(/^\d+$/);
const amount = z.string().regex(DECIMAL_PATTERN);
const rate = z.string().regex(DECIMAL_PATTERN);
export const exchangeSchema = z
  .object({
    clientId: id,
    fromCurrencyId: id,
    fromAmount: amount,
    toCurrencyId: id,
    toAmount: amount,
    exchangeRate: rate,
    description: z.string().optional(),
    /** صندوق الأرباح والخسائر الذي تُنسب إليه نتيجة التصريف (اختياري — افتراضياً حساب SYS-PNL في الواجهة). */
    profitLossClientId: id.optional(),
  })
  .strict();
