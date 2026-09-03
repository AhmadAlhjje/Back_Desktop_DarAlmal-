import type { Clock } from '../../application/ports/services/Clock.js';
export class SystemClock implements Clock {
  now() {
    return new Date();
  }
}
