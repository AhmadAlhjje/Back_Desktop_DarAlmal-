import { EntrySide } from '../../../domain/enums/EntrySide.js';
import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { ReceiptPaymentType } from '../../../domain/enums/ReceiptPaymentType.js';
import { Money } from '../../../domain/value-objects/Money.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { Clock } from '../../ports/services/Clock.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
import { movementTimestamp, newMovementId } from './helpers.js';
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
      const { date, time } = movementTimestamp(this.clock);
      const id = newMovementId();
      const side = input.type === ReceiptPaymentType.RECEIPT ? EntrySide.THEM : EntrySide.US;
      const result = side === EntrySide.US ? input.amount : `-${input.amount}`;
      const movement = await r.movementRepository.create({
        id,
        movementNo: id,
        movementTypeId: type.id,
        clientId: input.clientId,
        description: input.statement ?? null,
        movementDate: date,
        movementTime: time,
        totalResult: result,
        status: MovementStatus.POSTED,
        createdBy: input.createdBy,
        updatedBy: null,
      });
      const detail = await r.receiptPaymentRepository.create({
        movementId: id,
        type: input.type,
        statement: input.statement ?? null,
        clientId: input.clientId,
        currencyId: input.currencyId,
        amount: input.amount,
      });
      await r.journalRepository.createMany([
        {
          movementId: id,
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
      return { movement, detail };
    });
  }
}
