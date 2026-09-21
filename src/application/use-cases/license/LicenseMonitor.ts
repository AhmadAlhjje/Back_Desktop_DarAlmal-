import type { OfficeRepository } from '../../ports/repositories/OfficeRepository.js';
import type { Clock } from '../../ports/services/Clock.js';
import type { Logger } from '../../ports/services/Logger.js';
import { MISSING_OFFICE_LICENSE, toLicenseState, type LicenseFields, type LicenseState } from '../../../domain/entities/License.js';

export type LicenseListener = (officeId: string, state: LicenseState) => void;

interface Cached {
  license: LicenseFields;
  at: number;
}

/**
 * يراقب ترخيص كل مكتب: يقرأ حالة المكتب بذاكرة قصيرة (`cacheMs`) لكل طلب، ويستطلع جدول
 * المكاتب دورياً (`pollMs`) ليُبلّغ المشتركين (بثّ SSE) فور تغيّر أي مكتب — فيظهر القفل أو يزول
 * خلال ثوانٍ من تغيير الحالة في لوحة التحكم دون أن ينقر المستخدم شيئاً.
 */
export class LicenseMonitor {
  private readonly cache = new Map<string, Cached>();
  private readonly signatures = new Map<string, string>();
  private primed = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly listeners = new Set<LicenseListener>();

  constructor(
    private readonly offices: OfficeRepository,
    private readonly clock: Clock,
    private readonly logger?: Logger,
    private readonly options: { cacheMs: number; pollMs: number } = { cacheMs: 5_000, pollMs: 10_000 },
  ) {}

  /** الحالة الفعلية لمكتب الآن. مكتب غير موجود = موقوف؛ تعذّر القراءة يُبقي آخر حالة معروفة أو «نشط». */
  async current(officeId: string): Promise<LicenseState> {
    const now = this.clock.now();
    const cached = this.cache.get(officeId);
    if (!cached || now.getTime() - cached.at > this.options.cacheMs) {
      try {
        const office = await this.offices.findById(officeId);
        this.cache.set(officeId, { license: office ?? MISSING_OFFICE_LICENSE, at: now.getTime() });
      } catch (error) {
        this.logger?.warn(
          { officeId, errorMessage: error instanceof Error ? error.message : String(error) },
          'license read failed; keeping last known state',
        );
        if (!cached)
          this.cache.set(officeId, {
            license: { status: 'ACTIVE', expiresAt: null, message: null, movementLimit: null, movementsUsed: 0 },
            at: now.getTime(),
          });
      }
    }
    return toLicenseState(this.cache.get(officeId)!.license, now);
  }

  /** يُبلَّغ عند كل تغيّر في الحالة الفعلية (أو الرسالة/التاريخ) لأي مكتب. */
  subscribe(listener: LicenseListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** قراءة طازجة لكل المكاتب مع تبليغ المشتركين بما تغيّر. */
  async refresh(): Promise<void> {
    let snapshot;
    try {
      snapshot = await this.offices.licenseSnapshot();
    } catch (error) {
      this.logger?.warn({ errorMessage: error instanceof Error ? error.message : String(error) }, 'license poll failed');
      return;
    }
    const now = this.clock.now();
    for (const row of snapshot) {
      this.cache.set(row.id, { license: row, at: now.getTime() });
      const state = toLicenseState(row, now);
      const signature = JSON.stringify({
        s: state.status,
        e: state.expiresAt?.getTime() ?? null,
        m: state.message,
        l: state.movementLimit,
        // العدّاد يُبثّ فقط لمن له حد (المكاتب بلا حد لا تحتاج حدثاً مع كل حركة)
        u: state.movementLimit === null ? null : state.movementsUsed,
      });
      const previous = this.signatures.get(row.id);
      this.signatures.set(row.id, signature);
      if (this.primed && previous !== signature) {
        this.logger?.info({ officeId: row.id, status: state.status }, 'license state changed');
        for (const listener of this.listeners) listener(row.id, state);
      }
    }
    this.primed = true;
  }

  start(): void {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.options.pollMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
