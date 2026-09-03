import { DomainError } from './DomainError.js';
export class InvalidExchangeRateError extends DomainError {
  constructor() {
    super('INVALID_EXCHANGE_RATE', 'Exchange rate must be a valid positive decimal');
  }
}
