import { z } from 'zod';
const id = z.string().regex(/^\d+$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/**
 * لحظة دقيقة بصيغة ISO **مع الإزاحة** (`2026-09-30T00:00:00+03:00`). الطوابع مخزّنة بـ UTC،
 * فالتاريخ المحلي وحده يُسقط حركات أول ساعات اليوم: فلتر «من اليوم إلى اليوم» لم يكن يُظهر حركة
 * الساعة الواحدة صباحاً (بلاغ 2026-09-30). الواجهة ترسل بداية اليوم ونهايته بتوقيتها.
 */
const instant = z
  .string()
  .datetime({ offset: true })
  .transform((v) => new Date(v));
/** حدود الفترة الدقيقة — مشتركة بين اليومية وسجل الحركات وكشف الحساب. */
const period = { from_at: instant.optional(), to_at: instant.optional() };
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export const journalQuerySchema = z
  .object({
    date_from: date.optional(),
    date_to: date.optional(),
    ...period,
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
    /** غائب = كل العملات (كشف موحّد بعمود العملة، بلا رصيد جارٍ مختلط). */
    currency_id: id.optional(),
    date_from: date.optional(),
    date_to: date.optional(),
    ...period,
    movement_type_id: id.optional(),
    /** طيّ ما قبل «تدوير الأرصدة» في سطر واحد (2026-09-23). */
    collapse_rollover: z.enum(['true', 'false']).optional(),
    /** ROLLED_OVER = العمليات المطويّة نفسها، للمراجعة فقط. */
    scope: z.enum(['CURRENT', 'ROLLED_OVER']).optional(),
    ...pagination,
  })
  .strict();
/** لوحة التحكم: «اليوم» بتوقيت المستخدم. */
export const dashboardQuerySchema = z.object(period).strict();
export const paginationQuerySchema = z.object(pagination).strict();
export const clientsQuerySchema = z.object({ ...pagination, archived: z.enum(['true', 'false']).optional() }).strict();
export const movementsQuerySchema = z
  .object({
    date_from: date.optional(),
    date_to: date.optional(),
    ...period,
    movement_type_id: id.optional(),
    client_id: id.optional(),
    currency_id: id.optional(),
    status: z.enum(['DRAFT', 'POSTED', 'CANCELLED', 'REVERSED']).optional(),
    movement_no: id.optional(),
    created_by: id.optional(),
    q: z.string().max(200).optional(),
    ...pagination,
  })
  .strict();
export const balancesQuerySchema = z.object({ as_of: date.optional(), as_of_at: instant.optional() }).strict();
export const balanceSheetQuerySchema = z
  .object({
    as_of: date.optional(),
    as_of_at: instant.optional(),
    currency_id: id.optional(),
    mode: z.enum(['valued', 'currency']).default('valued'),
    detail: z.enum(['simple', 'full']).default('simple'),
    q: z.string().max(200).optional(),
  })
  .strict();
