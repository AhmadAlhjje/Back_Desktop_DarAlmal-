import { DomainError } from '../errors/DomainError.js';
export class MovementNumber {
  private constructor(readonly value: string) {}
  static of(value: string): MovementNumber {
    if (!/^[1-9]\d*$/.test(value))
      throw new DomainError('INVALID_MOVEMENT_NUMBER', 'Movement number must be a positive integer');
    return new MovementNumber(value);
  }
}
