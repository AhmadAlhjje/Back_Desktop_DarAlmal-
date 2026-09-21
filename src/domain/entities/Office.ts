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
  /** لوغو المكتب من لوحة التحكم: مسار نسبي تحت `uploads/offices` أو null. */
  logoPath: string | null;
  /** يتغيّر مع كل رفع — يعرف به التطبيق أن عليه تنزيل اللوغو الجديد. */
  logoUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OfficeInput = Omit<Office, 'id' | 'createdAt' | 'updatedAt' | 'logoPath' | 'logoUpdatedAt'> &
  Partial<Pick<Office, 'logoPath' | 'logoUpdatedAt'>>;
export type OfficePatch = Partial<Omit<OfficeInput, 'code'>>;

/** ما يراه تطبيق المكتب عن مكتبه (مع الدخول، ومع `GET /license`، وعبر حدث SSE `office`). */
export interface OfficePublicInfo {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  /** رابط نسبي إلى جذر الخادم (`/uploads/offices/...`) أو null. */
  logoUrl: string | null;
  /** طابع زمني (ms) يتغيّر مع كل رفع؛ null بلا لوغو. */
  logoVersion: number | null;
}

export function officePublicInfo(o: Office): OfficePublicInfo {
  return {
    id: o.id,
    code: o.code,
    name: o.name,
    address: o.address,
    phone: o.phone,
    logoUrl: o.logoPath ? `/${o.logoPath.replace(/^\/+/, '')}` : null,
    logoVersion: o.logoPath && o.logoUpdatedAt ? o.logoUpdatedAt.getTime() : null,
  };
}

/** أبجدية الكود: بلا محارف ملتبسة عند القراءة والكتابة اليدوية. */
export const OFFICE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const OFFICE_CODE_LENGTH = 8;
export const OFFICE_CODE_PATTERN = new RegExp(`^[${OFFICE_CODE_ALPHABET}]{${OFFICE_CODE_LENGTH}}$`);

/** يطبّع ما يكتبه المستخدم: أحرف كبيرة بلا مسافات أو شرطات. */
export function normalizeOfficeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, '');
}
