import { z } from 'zod';
import { amountString } from './money.js';
const id = z.string().regex(/^\d+$/);
const amount = amountString;
export const receiptPaymentSchema = z
  .object({ statement: z.string().optional(), clientId: id, currencyId: id, amount, cashBoxClientId: id.optional() })
  .strict();
