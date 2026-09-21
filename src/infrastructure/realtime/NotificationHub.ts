import { EventEmitter } from 'node:events';
import type { Notification } from '../../domain/entities/types.js';
import type { LicenseState } from '../../domain/entities/License.js';
import type { OfficePublicInfo } from '../../domain/entities/Office.js';
import type { NotificationPublisher } from '../../application/ports/services/NotificationPublisher.js';
import type { SessionPresence } from '../../application/ports/services/SessionPresence.js';

/**
 * بثّ الإشعارات فورياً داخل العملية (SSE): كل إداري مشترك بمعرّفه يستقبل إشعاره لحظة إنشائه
 * بدل انتظار الاستطلاع الدوري من الواجهة.
 */
export class NotificationHub implements NotificationPublisher, SessionPresence {
  private readonly emitter = new EventEmitter();
  /** الجلسات الحيّة: adminId → (معرّف اتصال → deviceId). */
  private readonly live = new Map<string, Map<number, string | undefined>>();
  private connectionSeq = 0;

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  /** يسجّل بثّاً حيّاً لإداري على جهاز؛ يعيد دالة التحرير عند إغلاق الاتصال. */
  claim(adminId: string, deviceId: string | undefined): () => void {
    const id = ++this.connectionSeq;
    const mine = this.live.get(adminId) ?? new Map<number, string | undefined>();
    mine.set(id, deviceId);
    this.live.set(adminId, mine);
    return () => {
      const current = this.live.get(adminId);
      if (!current) return;
      current.delete(id);
      if (current.size === 0) this.live.delete(adminId);
    };
  }

  isActiveElsewhere(adminId: string, deviceId: string | undefined): boolean {
    const mine = this.live.get(adminId);
    if (!mine) return false;
    for (const other of mine.values()) {
      if (deviceId === undefined || other === undefined || other !== deviceId) return true;
    }
    return false;
  }

  /** الجهاز الذي يملك الجلسة الحيّة الآن (للتشخيص/اللوحة) أو null. */
  activeDevice(adminId: string): string | null {
    const mine = this.live.get(adminId);
    if (!mine) return null;
    for (const d of mine.values()) return d ?? 'unknown';
    return null;
  }

  publish(notification: Notification): void {
    this.emitter.emit(`admin:${notification.adminId}`, notification);
  }

  subscribe(adminId: string, listener: (notification: Notification) => void): () => void {
    const channel = `admin:${adminId}`;
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }

  /** حالة حساب إداري (تعطيل/تفعيل) لأجهزته المتصلة — يصل القفل/رفعه فوراً. */
  publishAccount(adminId: string, state: { isActive: boolean }): void {
    this.emitter.emit(`account:${adminId}`, state);
  }

  subscribeAccount(adminId: string, listener: (state: { isActive: boolean }) => void): () => void {
    const channel = `account:${adminId}`;
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }

  /** معلومات المكتب (الاسم/العنوان/اللوغو) لأجهزته المتصلة — تغيير اللوغو من اللوحة يصل فوراً. */
  publishOffice(info: OfficePublicInfo): void {
    this.emitter.emit(`office:${info.id}`, info);
  }

  subscribeOffice(officeId: string, listener: (info: OfficePublicInfo) => void): () => void {
    const channel = `office:${officeId}`;
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }

  /** حالة ترخيص مكتب لكل أجهزته المتصلة (قناة لكل مكتب). */
  publishLicense(officeId: string, state: LicenseState): void {
    this.emitter.emit(`license:${officeId}`, state);
  }

  subscribeLicense(officeId: string, listener: (state: LicenseState) => void): () => void {
    const channel = `license:${officeId}`;
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }
}
