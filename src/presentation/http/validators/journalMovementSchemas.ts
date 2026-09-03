import { z } from 'zod';
const id = z.string().regex(/^\d+$/);
const decimal = z.string().regex(/^\d+(\.\d{1,8})?$/);
const entry = z
  .object({
    clientId: id,
    currencyId: id,
    amount: decimal,
    side: z.enum(['US', 'THEM']),
    exchangeRate: decimal.optional(),
    fees: decimal.optional(),
    feePercentage: decimal.optional(),
    description: z.string().optional(),
  })
  .strict();
export const createJournalMovementSchema = z
  .object({ clientId: id.optional(), description: z.string().optional(), entries: z.array(entry).min(1).max(500) })
  .strict();
