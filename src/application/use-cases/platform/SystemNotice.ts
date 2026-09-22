import type { PlatformNoticeRepository } from '../../ports/repositories/PlatformNoticeRepository.js';
import type { Logger } from '../../ports/services/Logger.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import { NO_NOTICE, noticeBlocks, type PlatformNotice, type PlatformNoticeInput } from '../../../domain/entities/PlatformNotice.js';

export const SYSTEM_NOTICE_CODE = 'SYSTEM_NOTICE';

/**
 * إعلان المنصّة: قراءة بذاكرة قصيرة (يُستطلع من كل تطبيق مقفل) وكتابة من لوحة التحكم.
 * يُستعمل في مكانين فقط: `GET /system/notice` (إقلاع التطبيق) وتسجيل الدخول — عمداً، حتى لا
 * تظهر الرسالة لمن هو داخل التطبيق قبل أن يخرج ويعود (قرار المستخدم 2026-09-23).
 */
export class SystemNotice {
  private cached: { notice: PlatformNotice; at: number } | null = null;

  constructor(
    private readonly repository: PlatformNoticeRepository,
    private readonly cacheMs = 5_000,
    private readonly logger?: Logger,
  ) {}

  async current(): Promise<PlatformNotice> {
    const now = Date.now();
    if (this.cached && now - this.cached.at <= this.cacheMs) return this.cached.notice;
    try {
      const notice = await this.repository.get();
      this.cached = { notice, at: now };
      return notice;
    } catch (error) {
      // تعذّر القراءة لا يوقف أحداً: لا نقفل التطبيقات بسبب خطأ قاعدة بيانات.
      this.logger?.warn(
        { errorMessage: error instanceof Error ? error.message : String(error) },
        'platform notice read failed; treating as no notice',
      );
      return this.cached?.notice ?? NO_NOTICE;
    }
  }

  async set(input: PlatformNoticeInput): Promise<PlatformNotice> {
    const notice = await this.repository.set(input);
    this.cached = { notice, at: Date.now() };
    return notice;
  }

  /** خطأ 403 يحمل نصّ الإعلان ليعرضه التطبيق مباشرة؛ null إن لم يكن هناك إعلان فعّال. */
  async errorIfBlocking(): Promise<ApplicationError | null> {
    const notice = await this.current();
    if (!noticeBlocks(notice)) return null;
    return new ApplicationError(SYSTEM_NOTICE_CODE, notice.message, 403, {
      title: notice.title,
      message: notice.message,
      updatedAt: notice.updatedAt,
    });
  }
}
