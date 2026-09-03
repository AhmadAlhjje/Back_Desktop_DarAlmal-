import type { NotificationRepository } from '../../ports/repositories/NotificationRepository.js';
export class GetNotifications {
  constructor(private notifications: NotificationRepository) {}
  async execute(adminId: string, page: number, limit: number) {
    const result = await this.notifications.findPage(adminId, page, limit);
    return {
      notifications: result.rows,
      pagination: { page, limit, total: result.count, pages: Math.ceil(result.count / limit) },
    };
  }
}
