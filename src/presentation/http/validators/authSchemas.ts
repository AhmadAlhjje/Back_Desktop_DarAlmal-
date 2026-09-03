import { z } from 'zod';
export const loginSchema = z
  .object({ fullName: z.string().min(1).max(150), password: z.string().min(8).max(200) })
  .strict();
