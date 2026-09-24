import { z } from 'zod';
import { DECIMAL_PATTERN, toAmount } from '../../../domain/value-objects/Precision.js';

/**
 * مبلغ وارد من الواجهة: يُقبل بأي دقّة ثم **يُقرَّب إلى منزلتين** قبل الحساب والتخزين
 * (قرار المستخدم 2026-09-24) — فلا يدخل النظام مبلغ بأكثر من منزلتين مهما أرسل العميل.
 */
export const amountString = z.string().regex(DECIMAL_PATTERN).transform(toAmount);

/** سعر صرف: يبقى بدقّته الكاملة (ليس مبلغاً). */
export const rateString = z.string().regex(DECIMAL_PATTERN);
