import { describe, expect, it } from 'vitest';
import { Money } from '../../src/domain/value-objects/Money.js';
describe('Money', () => {
  it('keeps decimal precision', () => expect(Money.of('0.1').add(Money.of('0.2')).toString()).toBe('0.3000000000'));
  it('rejects non-positive amounts when required', () => expect(() => Money.positive('0')).toThrow());
});
