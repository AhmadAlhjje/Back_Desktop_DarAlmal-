import { Decimal } from 'decimal.js';

/**
 * الدقة العشرية (قرار المستخدم 2026-09-24): **المبالغ بمنزلتين عشريتين** في كل النظام — تُحسب
 * وتُعاد وتُخزَّن بمنزلتين (السجلات الأقدم بدقّة أعلى تبقى كما هي وتُعرض مقرَّبة).
 * أسعار الصرف وحدها تبقى بعشر منازل: تقريبها إلى منزلتين يُفسد التحويل (سعر مثل 0.0000666
 * يصبح صفراً)، وهي معامِل لا مبلغ.
 */
export const AMOUNT_SCALE = 2;
export const RATE_SCALE = 10;
export const ZERO_AMOUNT = '0.00';
export const UNIT_RATE = '1.0000000000';
/** نمط التحقق الشكلي لأي مبلغ/سعر مرسل من الواجهة (حتى 10 منازل — المبالغ تُقرَّب بعدها). */
export const DECIMAL_PATTERN = /^\d+(\.\d{1,10})?$/;
/** يقرّب أي مبلغ وارد إلى منزلتين قبل الحساب والتخزين. */
export const toAmount = (value: string): string => new Decimal(value).toFixed(AMOUNT_SCALE);
/** هل النص يمثّل صفراً (بأي عدد من الأصفار العشرية)؟ يُستعمل بدل المقارنة النصية مع '0.00'. */
export const isZeroAmount = (value: string | null | undefined): boolean => !value || /^-?0+(\.0+)?$/.test(value);
