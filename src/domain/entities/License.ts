/**
 * حالة ترخيص المكتب (قرار المستخدم 2026-09-20): تُخزَّن في صف المكتب (`offices.status`) ويغيّرها
 * مالك النظام من لوحة التحكم. أي حالة غير `ACTIVE` تقفل التطبيق كاملاً لذلك المكتب.
 *
 * حد الحركات (قرار المستخدم 2026-09-22): `movementLimit` (null = بلا حد) مقابل `movementsUsed` (عدّاد
 * الإضافات فقط، يُصفَّر من اللوحة). بلوغه **لا يقفل التطبيق**: كل شيء يعمل (عرض/تعديل/حذف) ويُمنع
 * إضافة حركة جديدة فقط (`403 LICENSE_LIMIT_REACHED` على مسارات الإضافة) حتى يرفع المالك الحد.
 */
export type StoredLicenseStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
export type LicenseStatus = StoredLicenseStatus;

export const LICENSE_STATUSES: readonly StoredLicenseStatus[] = ['ACTIVE', 'SUSPENDED', 'EXPIRED'];

/** حقول الترخيص كما يكتبها المالك (+ عدّاد الحركات الذي يزيده الخادم). */
export interface LicenseFields {
  status: StoredLicenseStatus;
  /** تاريخ انتهاء الاشتراك (اختياري): بعده يُعتبر `ACTIVE` منتهياً تلقائياً. */
  expiresAt: Date | null;
  /** رسالة اختيارية تُعرض للمكتب في شاشة القفل (سبب الإيقاف، طريقة التجديد…). */
  message: string | null;
  /** أقصى عدد حركات مسموح (إضافات فقط)؛ null = بلا حد. */
  movementLimit: number | null;
  /** عدد الحركات المضافة حتى الآن (لا ينقص بالتعديل أو الحذف). */
  movementsUsed: number;
}

/** ما يُعرض للواجهة: الحالة الفعلية بعد احتساب تاريخ الانتهاء وحد الحركات. */
export interface LicenseState extends Omit<LicenseFields, 'status'> {
  status: LicenseStatus;
  checkedAt: Date;
}

/** هل بلغ المكتب حد الحركات؟ (بلا حد ⇒ لا). */
export function movementLimitReached(license: Pick<LicenseFields, 'movementLimit' | 'movementsUsed'>): boolean {
  return license.movementLimit !== null && license.movementLimit !== undefined && license.movementsUsed >= license.movementLimit;
}

/** الحالة الفعلية: موقوف/منتهٍ كما هما؛ `ACTIVE` مع تاريخ مضى = `EXPIRED` (حد الحركات لا يغيّر الحالة). */
export function effectiveLicenseStatus(license: Pick<LicenseFields, 'status' | 'expiresAt'>, now: Date): LicenseStatus {
  if (license.status !== 'ACTIVE') return license.status;
  if (license.expiresAt && license.expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  return 'ACTIVE';
}

export function toLicenseState(license: LicenseFields, now: Date): LicenseState {
  return {
    status: effectiveLicenseStatus(license, now),
    expiresAt: license.expiresAt,
    message: license.message,
    movementLimit: license.movementLimit ?? null,
    movementsUsed: license.movementsUsed ?? 0,
    checkedAt: now,
  };
}

/** ترخيص مكتب غير موجود (حُذف أو كود خاطئ): موقوف برسالة واضحة. */
export const MISSING_OFFICE_LICENSE: LicenseFields = {
  status: 'SUSPENDED',
  expiresAt: null,
  message: 'المكتب غير موجود',
  movementLimit: null,
  movementsUsed: 0,
};
