import type { Repositories } from '../repositories/types.js';
export interface UnitOfWork {
  execute<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}
