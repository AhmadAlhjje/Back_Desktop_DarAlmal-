import { z } from 'zod';
import { DECIMAL_PATTERN } from '../../../domain/value-objects/Precision.js';
import { amountString } from './money.js';
const id = z.string().regex(/^\d+$/);
const decimal = z.string().regex(DECIMAL_PATTERN);
export const createTransferSchema = z
  .object({
    statement: z.string().optional(),
    transferAmount: amountString,
    transferCurrencyId: id,
    fromClientId: id,
    fromCurrencyId: id,
    fromExchangeRate: decimal,
    feeUs: amountString.optional(),
    feeUsPercentage: decimal.optional(),
    toClientId: id,
    toCurrencyId: id,
    toExchangeRate: decimal,
    feeThem: amountString.optional(),
    feeThemPercentage: decimal.optional(),
    descriptionUs: z.string().optional(),
    descriptionThem: z.string().optional(),
  })
  .strict();
