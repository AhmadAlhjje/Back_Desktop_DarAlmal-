import { z } from 'zod';
import { amountString, rateString } from './money.js';
const id = z.string().regex(/^\d+$/);
const amount = amountString;
const rate = rateString;
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
