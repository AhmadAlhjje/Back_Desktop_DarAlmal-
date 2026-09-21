/**
 * جهاز مسجَّل لمكتب (قرار المستخدم 2026-09-22): كود المكتب يُستهلك مرة واحدة عند أول دخول على
 * جهاز، فيُصدَر له مفتاح دائم يرسله مع كل دخول لاحق بدل الكود (الذي يتولّد من جديد ويظهر في
 * اللوحة فقط). المفتاح يُخزَّن مجزَّأً (SHA-256) — لا يمكن استرجاعه من القاعدة.
 */
export interface OfficeDevice {
  id: string;
  officeId: string;
  /** وصف للعرض في اللوحة (اسم الإداري الذي فعّل الجهاز + وقت التفعيل). */
  label: string | null;
  enrolledBy: string | null;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface OfficeDeviceInput {
  officeId: string;
  keyHash: string;
  label: string | null;
  enrolledBy: string | null;
}
