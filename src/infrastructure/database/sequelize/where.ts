/**
 * شرط «حساب + عملة» لاستعلامات القيود.
 *
 * كشف «كل العملات» يمرّر `currencyId = undefined`، وSequelize **يرمي** عند وجود قيمة undefined في
 * `where` (`WHERE parameter "currency_id" has invalid "undefined" value`) فيصل الخطأ للمستخدم كـ
 * «خطأ في الخادم» (بلاغ 2026-09-26). المفتاح يُحذف تماماً بدل تمرير undefined.
 */
export const clientCurrencyWhere = (
  clientId: string,
  currencyId?: string,
): { client_id: string; currency_id?: string } => ({
  client_id: clientId,
  ...(currencyId ? { currency_id: currencyId } : {}),
});
