import { describe, expect, it } from 'vitest';
import { newMovementId } from '../../src/application/use-cases/movements/helpers.js';

describe('newMovementId', () => {
  it('is time-ordered so later movements sort first with id DESC', () => {
    const earlier = BigInt(newMovementId(1_000_000));
    const later = BigInt(newMovementId(1_000_001));
    expect(later > earlier).toBe(true);
  });
  it('fits in a signed 64-bit integer and is unique', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newMovementId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(BigInt(id) < 0x7fffffffffffffffn).toBe(true);
  });
});
