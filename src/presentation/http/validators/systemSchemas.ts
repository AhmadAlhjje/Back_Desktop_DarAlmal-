import { z } from 'zod';
export const resetDataSchema = z
  .object({ password: z.string().min(1).max(200), confirmation: z.string().min(1).max(50) })
  .strict();
export const deleteOwnAccountSchema = z.object({ password: z.string().min(1).max(200) }).strict();
