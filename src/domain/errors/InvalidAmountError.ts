import { DomainError } from './DomainError.js';
export class InvalidAmountError extends DomainError {
  constructor() {
    super('INVALID_AMOUNT', 'Amount must be a valid positive decimal');
  }
}
