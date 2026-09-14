import { z } from 'zod';
import { DECIMAL_PATTERN } from '../../../domain/value-objects/Precision.js';
const id = z.string().regex(/^\d+$/);
const decimal = z.string().regex(DECIMAL_PATTERN);
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
