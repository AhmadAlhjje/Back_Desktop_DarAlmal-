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
