import type { AdminRepository, NotificationRepository } from '../../ports/repositories/types.js';
import type { Logger } from '../../ports/services/Logger.js';
import type { NotificationPublisher } from '../../ports/services/NotificationPublisher.js';

export interface NotificationEvent {
  title: string;
  message: string;
  type: 'MOVEMENT' | 'CLIENT' | 'CURRENCY' | 'ADMIN' | 'SYSTEM' | 'ALERT';
  movementId?: string | null;
  /** الإداري الذي نفّذ العملية (يُحفظ اسمه مع الإشعار). */
  actorId?: string | null;
}

/**
 * توزيع إشعار على كل الإداريين النشطين (قرار د9 — معتمد 2026-09-13).
 * لا يؤثر فشل الإشعار على نجاح العملية الأصلية: الأخطاء تُسجَّل ولا تُرمى.
 */
export class NotifyAdmins {
  constructor(
    private admins: AdminRepository,
    private notifications: NotificationRepository,
    private logger: Logger,
    private publisher?: NotificationPublisher,
  ) {}
  async execute(event: NotificationEvent): Promise<number> {
    try {
      const recipients = await this.admins.findAllActive();
      const actor = event.actorId ? await this.admins.findById(event.actorId) : null;
      const created = await Promise.all(
        recipients.map((admin) =>
          this.notifications.create({
            adminId: admin.id,
            title: event.title,
            message: event.message,
            type: event.type,
            movementId: event.movementId ?? null,
            isRead: false,
            actorId: event.actorId ?? null,
            actorName: actor?.fullName ?? null,
          }),
        ),
      );
      // بثّ فوري لكل مستلم متصل (الوصول لحظي بدل انتظار الاستطلاع).
      for (const n of created) this.publisher?.publish(n);
      return recipients.length;
    } catch (error) {
      this.logger.error({ err: error, event }, 'notification dispatch failed');
      return 0;
    }
  }
}
