import type { MovementRepository } from '../../ports/repositories/MovementRepository.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
export class GetMovementDetails {
  constructor(private movements: MovementRepository) {}
  async execute(id: string) {
    const result = await this.movements.findDetails(id);
    if (!result) throw new ApplicationError('MOVEMENT_NOT_FOUND', 'Movement not found', 404);
    return result;
  }
}
