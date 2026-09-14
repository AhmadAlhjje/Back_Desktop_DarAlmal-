import { randomBytes } from 'node:crypto';
import type { Clock } from '../../ports/services/Clock.js';

/**
 * معرّف الحركة/رقمها: 63 بت مرتّب زمنياً (41 بت ميلي ثانية + 22 بت عشوائي).
 * الجزء الزمني يجعل الترتيب «الأحدث أولاً» بالمعرّف مستقراً حتى للحركات المنشأة في الثانية نفسها
 * (مثل عكس حركة ثم إنشاء بديلها عند التعديل)، والجزء العشوائي يمنع التخمين والتصادم.
 */
export function newMovementId(now: number = Date.now()): string {
  const random = BigInt(`0x${randomBytes(4).toString('hex')}`) & 0x3fffffn;
  const value = ((BigInt(now) & 0x1ffffffffffn) << 22n) | random;
  return (value || 1n).toString();
}
export function movementTimestamp(clock: Clock) {
  const iso = clock.now().toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
}
