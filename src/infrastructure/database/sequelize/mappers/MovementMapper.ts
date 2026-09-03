import type { Movement } from '../../../../domain/entities/Movement.js';
import { MovementStatus } from '../../../../domain/enums/MovementStatus.js';
import type { MovementModel } from '../models/MovementModel.js';
export const MovementMapper = {
  toDomain(m: MovementModel): Movement {
    return {
      id: m.id_movement,
      movementNo: m.movement_no,
      movementTypeId: m.movement_type_id,
      clientId: m.client_id,
      description: null,
      movementDate: m.created_at.toISOString().slice(0, 10),
      movementTime: m.movement_time,
      totalResult: m.total_result,
      status: m.status as MovementStatus,
      createdBy: m.created_by,
      updatedBy: m.updated_by,
    };
  },
};
