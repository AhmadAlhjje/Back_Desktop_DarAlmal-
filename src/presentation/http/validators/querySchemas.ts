import { z } from 'zod';
const id = z.string().regex(/^\d+$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export const journalQuerySchema = z
  .object({
    date_from: date.optional(),
    date_to: date.optional(),
    client_id: id.optional(),
    currency_id: id.optional(),
    movement_type_id: id.optional(),
    movement_no: id.optional(),
    entry_side: z.enum(['US', 'THEM']).optional(),
    status: z.enum(['DRAFT', 'POSTED', 'CANCELLED', 'REVERSED']).optional(),
    ...pagination,
  })
  .strict();
export const statementQuerySchema = z
  .object({
    currency_id: id,
    date_from: date.optional(),
    date_to: date.optional(),
    movement_type_id: id.optional(),
    ...pagination,
  })
  .strict();
export const paginationQuerySchema = z.object(pagination).strict();
export const clientsQuerySchema = z.object({ ...pagination, archived: z.enum(['true', 'false']).optional() }).strict();
export const movementsQuerySchema = z
  .object({
    date_from: date.optional(),
    date_to: date.optional(),
    movement_type_id: id.optional(),
    client_id: id.optional(),
    status: z.enum(['DRAFT', 'POSTED', 'CANCELLED', 'REVERSED']).optional(),
    movement_no: id.optional(),
    created_by: id.optional(),
    q: z.string().max(200).optional(),
    ...pagination,
  })
  .strict();
export const balancesQuerySchema = z.object({ as_of: date.optional() }).strict();
export const balanceSheetQuerySchema = z
  .object({
    as_of: date.optional(),
    currency_id: id.optional(),
    mode: z.enum(['valued', 'currency']).default('valued'),
    detail: z.enum(['simple', 'full']).default('simple'),
    q: z.string().max(200).optional(),
  })
  .strict();
