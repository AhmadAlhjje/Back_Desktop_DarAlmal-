/**
 * حالة ترخيص المكتب (قرار المستخدم 2026-09-20): تُخزَّن في صف المكتب (`offices.status`) ويغيّرها
 * مالك النظام من لوحة التحكم. أي حالة غير `ACTIVE` تقفل التطبيق كاملاً لذلك المكتب.
 */
export type LicenseStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';

export const LICENSE_STATUSES: readonly LicenseStatus[] = ['ACTIVE', 'SUSPENDED', 'EXPIRED'];

/** حقول الترخيص كما يكتبها المالك. */
export interface LicenseFields {
  status: LicenseStatus;
  /** تاريخ انتهاء الاشتراك (اختياري): بعده يُعتبر `ACTIVE` منتهياً تلقائياً. */
  expiresAt: Date | null;
  /** رسالة اختيارية تُعرض للمكتب في شاشة القفل (سبب الإيقاف، طريقة التجديد…). */
  message: string | null;
}

/** ما يُعرض للواجهة: الحالة الفعلية بعد احتساب تاريخ الانتهاء. */
export interface LicenseState extends LicenseFields {
  checkedAt: Date;
}

/** الحالة الفعلية: `ACTIVE` مع تاريخ انتهاء مضى = `EXPIRED`؛ غير ذلك كما هي. */
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
    checkedAt: now,
  };
}

/** ترخيص مكتب غير موجود (حُذف أو كود خاطئ): موقوف برسالة واضحة. */
export const MISSING_OFFICE_LICENSE: LicenseFields = { status: 'SUSPENDED', expiresAt: null, message: 'المكتب غير موجود' };
