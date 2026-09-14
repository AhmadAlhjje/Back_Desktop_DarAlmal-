/**
 * الدقة العشرية الموحّدة (قرار المستخدم 2026-09-14): المبالغ والأسعار تُخزَّن وتُعاد بعشر منازل عشرية
 * (DECIMAL(30,10)) بدل 4 للمبالغ و8 للأسعار؛ الواجهة تعرض المنازل المعنوية فقط بلا أصفار زائدة.
 */
export const AMOUNT_SCALE = 10;
export const RATE_SCALE = 10;
export const ZERO_AMOUNT = '0.0000000000';
export const UNIT_RATE = '1.0000000000';
/** نمط التحقق الشكلي لأي مبلغ/سعر مرسل من الواجهة. */
export const DECIMAL_PATTERN = /^\d+(\.\d{1,10})?$/;
/** هل النص يمثّل صفراً (بأي عدد من الأصفار العشرية)؟ يُستعمل بدل المقارنة النصية مع '0.0000'. */
export const isZeroAmount = (value: string | null | undefined): boolean => !value || /^-?0+(\.0+)?$/.test(value);
