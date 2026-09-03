import { z } from 'zod';
const id = z.string().regex(/^\d+$/);
const amount = z.string().regex(/^\d+(\.\d{1,4})?$/);
export const receiptPaymentSchema = z
  .object({ statement: z.string().optional(), clientId: id, currencyId: id, amount })
  .strict();
