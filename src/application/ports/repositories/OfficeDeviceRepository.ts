import type { OfficeDevice, OfficeDeviceInput } from '../../../domain/entities/OfficeDevice.js';

/** أجهزة المكاتب (غير مقيّدة بمستأجر — الدخول يحدث قبل معرفة المكتب). */
export interface OfficeDeviceRepository {
  create(input: OfficeDeviceInput): Promise<OfficeDevice>;
  /** الجهاز الفعّال (غير الملغى) بتجزئة مفتاحه، أو null. */
  findActiveByKeyHash(keyHash: string): Promise<OfficeDevice | null>;
  listByOffice(officeId: string): Promise<OfficeDevice[]>;
  /** إلغاء جهاز: دخوله التالي بالمفتاح يُرفض فيطلب التطبيق كود مكتب جديداً. */
  revoke(officeId: string, deviceId: string): Promise<OfficeDevice | null>;
  touch(id: string, at: Date): Promise<void>;
}
