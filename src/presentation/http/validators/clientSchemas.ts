import { z } from 'zod';
export const createClientSchema = z
  .object({
    code: z.string().min(1).max(50),
    groupId: z.string().regex(/^\d+$/).nullable().default(null),
    fullName: z.string().min(1).max(200),
    phone: z.string().max(30).nullable().default(null),
    email: z.string().email().max(150).nullable().default(null),
    address: z.string().nullable().default(null),
    importance: z.number().int().min(0).max(100000).default(0),
    accountType: z.enum(['CLIENT', 'BOX']).default('CLIENT'),
  })
  .strict();
export const archiveClientSchema = z.object({ archived: z.boolean().default(true) }).strict();
export const secretClientSchema = z.object({ isSecret: z.boolean() }).strict();
export const updateClientSchema = createClientSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');
