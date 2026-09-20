import { EventEmitter } from 'node:events';
import type { Notification } from '../../domain/entities/types.js';
import type { LicenseState } from '../../domain/entities/License.js';
import type { NotificationPublisher } from '../../application/ports/services/NotificationPublisher.js';

/**
 * بثّ الإشعارات فورياً داخل العملية (SSE): كل إداري مشترك بمعرّفه يستقبل إشعاره لحظة إنشائه
 * بدل انتظار الاستطلاع الدوري من الواجهة.
 */
export class NotificationHub implements NotificationPublisher {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
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
