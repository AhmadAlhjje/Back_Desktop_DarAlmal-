import { z } from 'zod';
import { DECIMAL_PATTERN } from '../../../domain/value-objects/Precision.js';
const id = z.string().regex(/^\d+$/);
const amount = z.string().regex(DECIMAL_PATTERN);
export const receiptPaymentSchema = z
  .object({ statement: z.string().optional(), clientId: id, currencyId: id, amount })
  .strict();
