import { z } from 'zod';
export const createClientGroupSchema = z
  .object({
    name: z.string().min(1).max(150),
    description: z.string().nullable().default(null),
  })
  .strict();
export const updateClientGroupSchema = createClientGroupSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');
export const createCurrencySchema = z
  .object({
    name: z.string().min(1).max(100),
    code: z
      .string()
      .min(2)
      .max(10)
      .transform((v) => v.toUpperCase()),
    symbol: z.string().max(20).nullable().default(null),
    decimalPlaces: z.number().int().min(0).max(8).default(2),
    iconPath: z.null().default(null),
    textIcon: z.string().max(20).nullable().default(null),
    importance: z.number().int().min(0).max(100000).default(0),
    exchangeRate: z
      .string()
      .regex(/^\d+(\.\d{1,8})?$/)
      .default('1.00000000'),
    exchangeType: z.enum(['FROM_USD_MULTIPLY', 'TO_USD_DIVIDE']).default('FROM_USD_MULTIPLY'),
    isActive: z.boolean().default(true),
  })
  .strict();
export const updateCurrencySchema = createCurrencySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');
