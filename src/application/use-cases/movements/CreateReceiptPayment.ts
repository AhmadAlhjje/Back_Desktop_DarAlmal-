import { EntrySide } from '../../../domain/enums/EntrySide.js';
import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { ReceiptPaymentType } from '../../../domain/enums/ReceiptPaymentType.js';
import { Money } from '../../../domain/value-objects/Money.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { Clock } from '../../ports/services/Clock.js';
import type { Repositories } from '../../ports/repositories/types.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
import { describeMovement, diffDescriptions, movementTimestamp } from './helpers.js';
import { loadEditableMovement } from './editing.js';
export interface CreateReceiptPaymentInput {
  type: ReceiptPaymentType;
  statement?: string;
  clientId: string;
  currencyId: string;
  amount: string;
  createdBy: string;
}
export class CreateReceiptPayment {
  constructor(
    private uow: UnitOfWork,
    private clock: Clock,
  ) {}
  execute(input: CreateReceiptPaymentInput) {
    return this.uow.execute(async (r) => {
      const p = await this.prepare(r, input);
      const { date, time } = movementTimestamp(this.clock);
      const id = await r.movementRepository.nextNumber();
      const movement = await r.movementRepository.create({
        id,
        movementNo: id,
        movementTypeId: p.typeId,
        clientId: input.clientId,
        description: input.statement ?? null,
        movementDate: date,
        movementTime: time,
        totalResult: p.totalResult,
        status: MovementStatus.POSTED,
        createdBy: input.createdBy,
        updatedBy: null,
      });
      const detail = await p.persist(id, date, time);
      return { movement, detail };
    });
  }

  /** تعديل سند القبض/الدفع في مكانه (نفس الرقم)؛ يجوز تبديل النوع بين قبض ودفع. */
  replace(id: string, input: CreateReceiptPaymentInput, adminId: string) {
    return this.uow.execute(async (r) => {
      const original = await loadEditableMovement(r, id, 'RECEIPT', 'PAYMENT');
      const before = await describeMovement(r, id);
      const p = await this.prepare(r, input);
      await r.movementRepository.clearContents(id);
      const detail = await p.persist(id, original.movementDate, original.movementTime);
      await r.movementRepository.updateContents(id, {
        movementTypeId: p.typeId,
        clientId: input.clientId,
        description: input.statement ?? null,
        totalResult: p.totalResult,
        updatedBy: adminId,
      });
      const after = await describeMovement(r, id);
      const movement = (await r.movementRepository.findById(id))!;
      return { movement, detail, changes: diffDescriptions(before, after) };
    });
  }

  private async prepare(r: Repositories, input: CreateReceiptPaymentInput) {
    Money.positive(input.amount);
    const [type, client, currency] = await Promise.all([
      r.movementTypeRepository.findByCode(input.type),
      r.clientRepository.findById(input.clientId),
      r.currencyRepository.findById(input.currencyId),
    ]);
    if (!type?.isActive)
      throw new ApplicationError('MOVEMENT_TYPE_NOT_FOUND', `Active ${input.type} movement type not found`, 404);
    if (!client) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    if (!currency?.isActive) throw new ApplicationError('CURRENCY_NOT_FOUND', 'Active currency not found', 404);
    const side = input.type === ReceiptPaymentType.RECEIPT ? EntrySide.THEM : EntrySide.US;
    const totalResult = side === EntrySide.US ? input.amount : `-${input.amount}`;
    const persist = async (movementId: string, date: string, time: string) => {
      const detail = await r.receiptPaymentRepository.create({
        movementId,
        type: input.type,
        statement: input.statement ?? null,
        clientId: input.clientId,
        currencyId: input.currencyId,
        amount: input.amount,
      });
      await r.journalRepository.createMany([
        {
          movementId,
          lineNo: 1,
          clientId: input.clientId,
          currencyId: input.currencyId,
          amount: input.amount,
          side,
          exchangeRate: null,
          fees: '0',
          feePercentage: null,
          description: input.statement ?? null,
          movementDate: date,
          movementTime: time,
        },
      ]);
      return detail;
    };
    return { typeId: type.id, totalResult, persist };
  }
}
