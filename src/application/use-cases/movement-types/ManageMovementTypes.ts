import type { MovementType } from '../../../domain/entities/MovementType.js';
import type { MovementTypeRepository } from '../../ports/repositories/MovementTypeRepository.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
export class ManageMovementTypes {
  constructor(private types: MovementTypeRepository) {}
  async list(page: number, limit: number) {
    const r = await this.types.findPage(page, limit);
    return { movementTypes: r.rows, pagination: { page, limit, total: r.count, pages: Math.ceil(r.count / limit) } };
  }
  async update(id: string, input: Partial<Pick<MovementType, 'name' | 'description' | 'isActive'>>) {
    const value = await this.types.update(id, input);
    if (!value) throw new ApplicationError('MOVEMENT_TYPE_NOT_FOUND', 'Movement type not found', 404);
    return value;
  }
}
