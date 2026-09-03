import { Decimal } from 'decimal.js';
import { EntrySide } from '../../../domain/enums/EntrySide.js';
import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { Money } from '../../../domain/value-objects/Money.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { Clock } from '../../ports/services/Clock.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
import { movementTimestamp, newMovementId } from './helpers.js';
export interface SourceEntry {
  clientId: string;
  currencyId: string;
  amount: string;
  side: EntrySide;
  exchangeRate?: string;
  fees?: string;
  feePercentage?: string;
  description?: string;
}
export interface CreateJournalMovementInput {
  movementCode: 'SETTLEMENT' | 'MULTI';
  clientId?: string;
  description?: string;
  entries: SourceEntry[];
  createdBy: string;
}
export class CreateJournalMovement {
  constructor(
    private uow: UnitOfWork,
    private clock: Clock,
  ) {}
  execute(input: CreateJournalMovementInput) {
    return this.uow.execute(async (r) => {
      if (input.entries.length === 0) throw new ApplicationError('EMPTY_ENTRIES', 'At least one entry is required');
      const type = await r.movementTypeRepository.findByCode(input.movementCode);
      if (!type?.isActive)
        throw new ApplicationError(
          'MOVEMENT_TYPE_NOT_FOUND',
          `Active ${input.movementCode} movement type not found`,
          404,
        );
      for (const entry of input.entries) {
        Money.positive(entry.amount);
        const [client, currency] = await Promise.all([
          r.clientRepository.findById(entry.clientId),
          r.currencyRepository.findById(entry.currencyId),
        ]);
        if (!client) throw new ApplicationError('CLIENT_NOT_FOUND', 'A client was not found', 404);
        if (!currency?.isActive)
          throw new ApplicationError('CURRENCY_NOT_FOUND', 'An active currency was not found', 404);
      }
      const { date, time } = movementTimestamp(this.clock);
      const id = newMovementId();
      const result = input.entries
        .reduce((sum, e) => (e.side === EntrySide.US ? sum.add(e.amount) : sum.sub(e.amount)), new Decimal(0))
        .toFixed(4);
      const movement = await r.movementRepository.create({
        id,
        movementNo: id,
        movementTypeId: type.id,
        clientId: input.clientId ?? null,
        description: input.description ?? null,
        movementDate: date,
        movementTime: time,
        totalResult: result,
        status: MovementStatus.POSTED,
        createdBy: input.createdBy,
        updatedBy: null,
      });
      await r.journalRepository.createMany(
        input.entries.map((e, index) => ({
          movementId: id,
          lineNo: index + 1,
          clientId: e.clientId,
          currencyId: e.currencyId,
          amount: e.amount,
          side: e.side,
          exchangeRate: e.exchangeRate ?? null,
          fees: e.fees ?? '0',
          feePercentage: e.feePercentage ?? null,
          description: e.description ?? null,
          movementDate: date,
          movementTime: time,
        })),
      );
      return movement;
    });
  }
}
