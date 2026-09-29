/**
 * شرط «حساب + عملة» لاستعلامات القيود.
 *
 * كشف «كل العملات» يمرّر `currencyId = undefined`، وSequelize **يرمي** عند وجود قيمة undefined في
 * `where` (`WHERE parameter "currency_id" has invalid "undefined" value`) فيصل الخطأ للمستخدم كـ
 * «خطأ في الخادم» (بلاغ 2026-09-26). المفتاح يُحذف تماماً بدل تمرير undefined.
 */
/**
 * حدّا الفترة الزمنية للاستعلام.
 *
 * `created_at` مخزّن بتوقيت UTC (اتصال Sequelize بلا `timezone`)، ومقارنته بتاريخ محلي
 * «YYYY-MM-DD» تُسقط حركات أول ساعات اليوم في دمشق (UTC+3): حركة الساعة الواحدة صباحاً تُخزَّن
 * على تاريخ اليوم السابق، فلا يُظهرها فلتر «من اليوم إلى اليوم» (بلاغ المستخدم 2026-09-30).
 * لذلك ترسل الواجهة لحظتَي بداية اليوم ونهايته **بتوقيتها** (`from_at`/`to_at`) وتُقدَّمان على
 * التاريخ النصي، الذي يبقى للتوافق مع من لا يرسلهما.
 */
export const periodStart = (at?: Date, day?: string): Date | string | undefined =>
  at ?? (day ? `${day} 00:00:00` : undefined);
export const periodEnd = (at?: Date, day?: string): Date | string | undefined =>
  at ?? (day ? `${day} 23:59:59` : undefined);

export const clientCurrencyWhere = (
  clientId: string,
  currencyId?: string,
): { client_id: string; currency_id?: string } => ({
  client_id: clientId,
  ...(currencyId ? { currency_id: currencyId } : {}),
});
