import type { LicenseFields } from './License.js';

/**
 * المكتب (المستأجر) — قرار المستخدم 2026-09-20: باك اند واحد لكل المكاتب، وكل صف تجاري يحمل
 * `office_id`. يُنشأ من لوحة التحكم بكود يُولَّد مرة واحدة، ويسجّل المكتب الدخول بالكود + اسم
 * المستخدم + كلمة المرور؛ الكود يُخزَّن في التوكن ويحدّد المكتب في كل طلب.
 */
export interface Office extends LicenseFields {
  id: string;
  /** كود المكتب: 8 محارف من الأبجدية غير الملتبسة (بلا 0/O/1/I)، فريد، لا يتغيّر. */
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OfficeInput = Omit<Office, 'id' | 'createdAt' | 'updatedAt'>;
export type OfficePatch = Partial<Omit<OfficeInput, 'code'>>;

/** أبجدية الكود: بلا محارف ملتبسة عند القراءة والكتابة اليدوية. */
export const OFFICE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const OFFICE_CODE_LENGTH = 8;
export const OFFICE_CODE_PATTERN = new RegExp(`^[${OFFICE_CODE_ALPHABET}]{${OFFICE_CODE_LENGTH}}$`);

/** يطبّع ما يكتبه المستخدم: أحرف كبيرة بلا مسافات أو شرطات. */
export function normalizeOfficeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, '');
}
