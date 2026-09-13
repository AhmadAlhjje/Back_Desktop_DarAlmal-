import { z } from 'zod';
const id = z.string().regex(/^\d+$/);
const amount = z.string().regex(/^\d+(\.\d{1,4})?$/);
const rate = z.string().regex(/^\d+(\.\d{1,8})?$/);
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
