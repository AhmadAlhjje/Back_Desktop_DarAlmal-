import type { LicenseFields } from '../../../domain/entities/License.js';
import type { Office, OfficeInput, OfficePatch } from '../../../domain/entities/Office.js';

/** المكاتب (غير مقيّدة بمستأجر — تُقرأ من أي سياق). */
export interface OfficeRepository {
  findByCode(code: string): Promise<Office | null>;
  findById(id: string): Promise<Office | null>;
  list(): Promise<Office[]>;
  create(input: OfficeInput): Promise<Office>;
  update(id: string, patch: OfficePatch): Promise<Office | null>;
  /** تبديل كود المكتب (إعادة توليد عند ضياعه) — الكود القديم يتوقف فوراً. */
  setCode(id: string, code: string): Promise<Office | null>;
  /** لقطة خفيفة لمراقبة الترخيص: حقول الترخيص لكل المكاتب. */
  licenseSnapshot(): Promise<Array<{ id: string } & LicenseFields>>;
}
