import { randomBytes } from 'node:crypto';
import type { Clock } from '../../ports/services/Clock.js';
export function newMovementId(): string {
  const value = BigInt(`0x${randomBytes(8).toString('hex')}`) & 0x7fffffffffffffffn;
  return (value || 1n).toString();
}
export function movementTimestamp(clock: Clock) {
  const iso = clock.now().toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
}
