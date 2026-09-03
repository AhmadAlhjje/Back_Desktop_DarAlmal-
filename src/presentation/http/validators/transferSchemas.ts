import { z } from 'zod';
const id = z.string().regex(/^\d+$/);
const decimal = z.string().regex(/^\d+(\.\d{1,8})?$/);
export const createTransferSchema = z
  .object({
    statement: z.string().optional(),
    transferAmount: decimal,
    transferCurrencyId: id,
    fromClientId: id,
    fromCurrencyId: id,
    fromExchangeRate: decimal,
    feeUs: decimal.optional(),
    feeUsPercentage: decimal.optional(),
    toClientId: id,
    toCurrencyId: id,
    toExchangeRate: decimal,
    feeThem: decimal.optional(),
    feeThemPercentage: decimal.optional(),
    descriptionUs: z.string().optional(),
    descriptionThem: z.string().optional(),
  })
  .strict();
