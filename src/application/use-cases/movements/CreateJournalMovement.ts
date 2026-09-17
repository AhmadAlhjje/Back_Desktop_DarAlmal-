import { Decimal } from 'decimal.js';
import { EntrySide } from '../../../domain/enums/EntrySide.js';
import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { Money } from '../../../domain/value-objects/Money.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { Clock } from '../../ports/services/Clock.js';
import type { Repositories } from '../../ports/repositories/types.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
import { describeMovement, diffDescriptions, movementTimestamp } from './helpers.js';
import { loadEditableMovement } from './editing.js';
import { AMOUNT_SCALE } from '../../../domain/value-objects/Precision.js';
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
      const p = await this.prepare(r, input);
      const { date, time } = movementTimestamp(this.clock);
      const id = await r.movementRepository.nextNumber();
      const movement = await r.movementRepository.create({
        id,
        movementNo: id,
        movementTypeId: p.typeId,
        clientId: input.clientId ?? null,
        description: input.description ?? null,
        movementDate: date,
        movementTime: time,
        totalResult: p.totalResult,
        status: MovementStatus.POSTED,
        createdBy: input.createdBy,
        updatedBy: null,
      });
      await p.persist(id, date, time);
      return movement;
    });
  }

  /** تعديل التسوية/الحركة المتعددة في مكانها (نفس الرقم): تُعاد كتابة القيود بالمدخلات الجديدة. */
  replace(id: string, input: CreateJournalMovementInput, adminId: string) {
    return this.uow.execute(async (r) => {
      const original = await loadEditableMovement(r, id, input.movementCode);
      const before = await describeMovement(r, id);
      const p = await this.prepare(r, input);
      await r.movementRepository.clearContents(id);
      await p.persist(id, original.movementDate, original.movementTime);
      await r.movementRepository.updateContents(id, {
        clientId: input.clientId ?? null,
        description: input.description ?? null,
        totalResult: p.totalResult,
        updatedBy: adminId,
      });
      const after = await describeMovement(r, id);
      const movement = (await r.movementRepository.findById(id))!;
      return { movement, changes: diffDescriptions(before, after) };
    });
  }

  private async prepare(r: Repositories, input: CreateJournalMovementInput) {
    if (input.entries.length === 0) throw new ApplicationError('EMPTY_ENTRIES', 'At least one entry is required');
    const type = await r.movementTypeRepository.findByCode(input.movementCode);
    if (!type?.isActive)
      throw new ApplicationError('MOVEMENT_TYPE_NOT_FOUND', `Active ${input.movementCode} movement type not found`, 404);
    for (const entry of input.entries) {
      Money.positive(entry.amount);
      const [client, currency] = await Promise.all([
        r.clientRepository.findById(entry.clientId),
        r.currencyRepository.findById(entry.currencyId),
      ]);
      if (!client) throw new ApplicationError('CLIENT_NOT_FOUND', 'A client was not found', 404);
      if (!currency?.isActive) throw new ApplicationError('CURRENCY_NOT_FOUND', 'An active currency was not found', 404);
    }
    const totalResult = input.entries
      .reduce((sum, e) => (e.side === EntrySide.US ? sum.add(e.amount) : sum.sub(e.amount)), new Decimal(0))
      .toFixed(AMOUNT_SCALE);
    const persist = async (movementId: string, date: string, time: string) => {
      await r.journalRepository.createMany(
        input.entries.map((e, index) => ({
          movementId,
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
    };
    return { typeId: type.id, totalResult, persist };
  }
}
