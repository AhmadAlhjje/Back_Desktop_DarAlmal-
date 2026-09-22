import type { PlatformNotice, PlatformNoticeInput } from '../../../domain/entities/PlatformNotice.js';

/** إعلان المنصّة: صفّ واحد عام لكل المكاتب (غير مقيّد بمستأجر — يُقرأ قبل تسجيل الدخول). */
export interface PlatformNoticeRepository {
  get(): Promise<PlatformNotice>;
  set(input: PlatformNoticeInput): Promise<PlatformNotice>;
}
