import { Decimal } from 'decimal.js';
import { EntrySide } from '../../../domain/enums/EntrySide.js';
import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { Clock } from '../../ports/services/Clock.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
import { movementTimestamp, newMovementId } from './helpers.js';
export class ReverseMovement {
  constructor(
    private uow: UnitOfWork,
    private clock: Clock,
  ) {}
  execute(id: string, adminId: string) {
    return this.uow.execute(async (r) => {
      const original = await r.movementRepository.findById(id);
      if (!original) throw new ApplicationError('MOVEMENT_NOT_FOUND', 'Movement not found', 404);
      if (original.status !== MovementStatus.POSTED)
        throw new ApplicationError('MOVEMENT_NOT_POSTED', 'Only posted movements can be reversed', 409);
      const originalEntries = await r.journalRepository.findByMovement(id);
      if (!originalEntries.length)
        throw new ApplicationError('MOVEMENT_HAS_NO_JOURNAL', 'Posted movement has no journal entries', 409);
      const reverseId = newMovementId();
      const { date, time } = movementTimestamp(this.clock);
      const reverse = await r.movementRepository.create({
        id: reverseId,
        movementNo: reverseId,
        movementTypeId: original.movementTypeId,
        clientId: original.clientId,
        description: `Reversal of movement ${original.movementNo}`,
        movementDate: date,
        movementTime: time,
        totalResult: new Decimal(original.totalResult).negated().toFixed(4),
        status: MovementStatus.POSTED,
        createdBy: adminId,
        updatedBy: null,
      });
      await r.journalRepository.createMany(
        originalEntries.map((entry) => ({
          ...entry,
          id: undefined,
          movementId: reverseId,
          side: entry.side === EntrySide.US ? EntrySide.THEM : EntrySide.US,
          movementDate: date,
          movementTime: time,
          description: entry.description
            ? `Reversal: ${entry.description}`
            : `Reversal of movement ${original.movementNo}`,
        })),
      );
      await r.movementRepository.updateStatus(id, MovementStatus.REVERSED, adminId);
      return { originalMovementId: id, reverseMovement: reverse };
    });
  }
}
