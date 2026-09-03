import { z } from 'zod';
const role = z.enum(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE', 'VIEWER']);
export const createAdminSchema = z
  .object({
    fullName: z.string().min(1).max(150),
    phone: z.string().max(30).nullable().default(null),
    email: z.string().email().max(150).nullable().default(null),
    password: z.string().min(8).max(200),
    role,
    permissions: z.array(z.string().min(1).max(100)).nullable().default(null),
    isDeveloper: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .strict();
export const updateAdminSchema = createAdminSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');
