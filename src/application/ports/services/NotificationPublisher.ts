import type { Notification } from '../../../domain/entities/types.js';

/** منفذ بثّ الإشعارات الفوري (SSE/غيره) — اختياري؛ غيابه لا يعطّل حفظ الإشعارات. */
export interface NotificationPublisher {
  publish(notification: Notification): void;
}
