import { ConnectionError, ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from 'sequelize';
import { ApplicationError } from '../../../application/errors/ApplicationError.js';
import type { Logger } from '../../../application/ports/services/Logger.js';
export function mapDatabaseError(error: unknown, logger: Logger): Error {
  if (!(error instanceof Error))
    return new ApplicationError('INFRASTRUCTURE_ERROR', 'Unexpected infrastructure error', 500);
  logger.error({ errorName: error.name, errorMessage: error.message }, 'Database operation failed');
  if (error instanceof UniqueConstraintError)
    return new ApplicationError('CONFLICT', 'A record with the same unique value already exists', 409);
  if (error instanceof ForeignKeyConstraintError)
    return new ApplicationError('INVALID_REFERENCE', 'A referenced record does not exist or cannot be changed', 422);
  if (error instanceof ValidationError)
    return new ApplicationError('DATABASE_VALIDATION_ERROR', 'Stored data failed validation', 422);
  if (error instanceof ConnectionError)
    return new ApplicationError('DATABASE_UNAVAILABLE', 'Database service is unavailable', 503);
  return new ApplicationError('INFRASTRUCTURE_ERROR', 'Database operation failed', 500);
}
