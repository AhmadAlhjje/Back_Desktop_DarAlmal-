import { DomainError } from './DomainError.js';
export class InvalidMovementError extends DomainError {
  constructor(message: string) {
    super('INVALID_MOVEMENT', message);
  }
}
