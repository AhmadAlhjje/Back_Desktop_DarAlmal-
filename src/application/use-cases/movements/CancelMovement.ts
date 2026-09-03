import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
export class CancelMovement {
  constructor(private uow: UnitOfWork) {}
  execute(id: string, adminId: string) {
    return this.uow.execute(async (r) => {
      const movement = await r.movementRepository.findById(id);
      if (!movement) throw new ApplicationError('MOVEMENT_NOT_FOUND', 'Movement not found', 404);
      if (movement.status !== MovementStatus.POSTED)
        throw new ApplicationError('MOVEMENT_NOT_POSTED', 'Only posted movements can be cancelled', 409);
      await r.movementRepository.updateStatus(id, MovementStatus.CANCELLED, adminId);
      return { ...movement, status: MovementStatus.CANCELLED, updatedBy: adminId };
    });
  }
}
