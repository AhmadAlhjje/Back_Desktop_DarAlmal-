import type { NotificationRepository } from '../../ports/repositories/NotificationRepository.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
export class MarkNotificationRead {
  constructor(private notifications: NotificationRepository) {}
  async execute(id: string, adminId: string) {
    if (!(await this.notifications.markRead(id, adminId)))
      throw new ApplicationError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
    return { id, isRead: true };
  }
}
