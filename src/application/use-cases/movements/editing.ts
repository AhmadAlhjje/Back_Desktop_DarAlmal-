import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { Repositories } from '../../ports/repositories/types.js';

/**
 * تعديل الحركة في مكانها (قرار المستخدم 2026-09-15): الحركة المرحّلة تُعاد كتابة تفاصيلها وقيودها
 * بنفس الرقم بدل عكسها وإنشاء بديل. يُسمح فقط للحركات POSTED ومن النوع المطلوب.
 */
export async function loadEditableMovement(r: Repositories, id: string, ...allowedCodes: string[]) {
  const movement = await r.movementRepository.findById(id);
  if (!movement) throw new ApplicationError('MOVEMENT_NOT_FOUND', 'Movement not found', 404);
  if (movement.status !== MovementStatus.POSTED)
    throw new ApplicationError('MOVEMENT_NOT_POSTED', 'Only posted movements can be edited', 409);
  const type = await r.movementTypeRepository.findById(movement.movementTypeId);
  if (!type || !allowedCodes.includes(type.code))
    throw new ApplicationError('MOVEMENT_TYPE_MISMATCH', `Movement is not of type ${allowedCodes.join('/')}`, 409);
  return movement;
}
