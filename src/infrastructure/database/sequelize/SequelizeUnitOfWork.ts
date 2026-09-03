import type { UnitOfWork } from '../../../application/ports/services/UnitOfWork.js';
import type { Sequelize } from 'sequelize-typescript';
import { createRepositories } from './repositories/SequelizeRepositories.js';
import type { Logger } from '../../../application/ports/services/Logger.js';
import { mapDatabaseError } from './DatabaseErrorMapper.js';
import { ApplicationError } from '../../../application/errors/ApplicationError.js';
export class SequelizeUnitOfWork implements UnitOfWork {
  constructor(
    private db: Sequelize,
    private logger?: Logger,
  ) {}
  execute<T>(
    work: (repositories: import('../../../application/ports/repositories/types.js').Repositories) => Promise<T>,
  ): Promise<T> {
    return this.db
      .transaction<T>((transaction) => work(createRepositories(transaction, this.logger)))
      .catch((error) => {
        if (error instanceof ApplicationError) throw error;
        throw this.logger ? mapDatabaseError(error, this.logger) : error;
      });
  }
}
