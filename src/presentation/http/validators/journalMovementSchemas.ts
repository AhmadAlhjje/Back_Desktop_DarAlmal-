import { z } from 'zod';
import { DECIMAL_PATTERN } from '../../../domain/value-objects/Precision.js';
import { amountString } from './money.js';
const id = z.string().regex(/^\d+$/);
const decimal = z.string().regex(DECIMAL_PATTERN);
const entry = z
  .object({
    clientId: id,
    currencyId: id,
    amount: amountString,
    side: z.enum(['US', 'THEM']),
    exchangeRate: decimal.optional(),
    fees: amountString.optional(),
    feePercentage: decimal.optional(),
    description: z.string().optional(),
  })
  .strict();
export const createJournalMovementSchema = z
  .object({ clientId: id.optional(), description: z.string().optional(), entries: z.array(entry).min(1).max(500) })
  .strict();
