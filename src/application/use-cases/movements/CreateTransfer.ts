import { EntrySide } from '../../../domain/enums/EntrySide.js';
import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
import type { Clock } from '../../ports/services/Clock.js';
import type { Repositories } from '../../ports/repositories/types.js';
import { TransferCalculationService } from '../../../domain/services/TransferCalculationService.js';
import { describeMovement, diffDescriptions, movementTimestamp, newMovementId } from './helpers.js';
import { loadEditableMovement } from './editing.js';

export interface CreateTransferInput {
  statement?: string;
  transferAmount: string;
  transferCurrencyId: string;
  fromClientId: string;
  fromCurrencyId: string;
  fromExchangeRate: string;
  feeUs?: string;
  feeUsPercentage?: string;
  toClientId: string;
  toCurrencyId: string;
  toExchangeRate: string;
  feeThem?: string;
  feeThemPercentage?: string;
  descriptionUs?: string;
  descriptionThem?: string;
  createdBy: string;
}
export class CreateTransfer {
  constructor(
    private uow: UnitOfWork,
    private clock: Clock,
    private calculator = new TransferCalculationService(),
  ) {}
  async execute(input: CreateTransferInput) {
    return this.uow.execute(async (r) => {
      const p = await this.prepare(r, input);
      const { date, time } = movementTimestamp(this.clock);
      const id = newMovementId();
      const movement = await r.movementRepository.create({
        id,
        movementNo: id,
        movementTypeId: p.typeId,
        clientId: input.fromClientId,
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

  /** تعديل الحوالة في مكانها (نفس الرقم): تُعاد كتابة التفاصيل والقيود بالمدخلات الجديدة. */
  async replace(id: string, input: CreateTransferInput, adminId: string) {
    return this.uow.execute(async (r) => {
      const original = await loadEditableMovement(r, id, 'TRANSFER');
      const before = await describeMovement(r, id);
      const p = await this.prepare(r, input);
      await r.movementRepository.clearContents(id);
      const detail = await p.persist(id, original.movementDate, original.movementTime);
      await r.movementRepository.updateContents(id, {
        clientId: input.fromClientId,
        description: input.statement ?? null,
        totalResult: p.totalResult,
        updatedBy: adminId,
      });
      const after = await describeMovement(r, id);
      const movement = (await r.movementRepository.findById(id))!;
      return { movement, detail, changes: diffDescriptions(before, after) };
    });
  }

  /** التحقق والحساب (مشترك بين الإنشاء والتعديل)؛ لا يكتب شيئاً حتى استدعاء `persist`. */
  private async prepare(r: Repositories, input: CreateTransferInput) {
    if (input.fromClientId === input.toClientId)
      throw new ApplicationError('SAME_TRANSFER_CLIENT', 'Source and destination clients must differ');
    const [type, from, to, transferCurrency, fromCurrency, toCurrency] = await Promise.all([
      r.movementTypeRepository.findByCode('TRANSFER'),
      r.clientRepository.findById(input.fromClientId),
      r.clientRepository.findById(input.toClientId),
      r.currencyRepository.findById(input.transferCurrencyId),
      r.currencyRepository.findById(input.fromCurrencyId),
      r.currencyRepository.findById(input.toCurrencyId),
    ]);
    if (!type?.isActive)
      throw new ApplicationError('MOVEMENT_TYPE_NOT_FOUND', 'Active TRANSFER movement type not found', 404);
    if (!from || !to) throw new ApplicationError('CLIENT_NOT_FOUND', 'An active transfer client was not found', 404);
    if (![transferCurrency, fromCurrency, toCurrency].every((c) => c?.isActive))
      throw new ApplicationError('CURRENCY_NOT_FOUND', 'An active currency was not found', 404);
    const totals = this.calculator.calculate({
      amount: input.transferAmount,
      fromExchangeRate: input.fromExchangeRate,
      toExchangeRate: input.toExchangeRate,
      feeUs: input.feeUs,
      feeThem: input.feeThem,
    });
    const persist = async (movementId: string, date: string, time: string) => {
      const detail = await r.transferRepository.create({
        movementId,
        statement: input.statement ?? null,
        transferAmount: input.transferAmount,
        transferCurrencyId: input.transferCurrencyId,
        fromClientId: input.fromClientId,
        fromCurrencyId: input.fromCurrencyId,
        fromExchangeRate: input.fromExchangeRate,
        feeUs: input.feeUs ?? '0',
        feeUsPercentage: input.feeUsPercentage ?? null,
        totalUs: totals.totalUs,
        descriptionUs: input.descriptionUs ?? null,
        toClientId: input.toClientId,
        toCurrencyId: input.toCurrencyId,
        toExchangeRate: input.toExchangeRate,
        feeThem: input.feeThem ?? '0',
        feeThemPercentage: input.feeThemPercentage ?? null,
        totalThem: totals.totalThem,
        descriptionThem: input.descriptionThem ?? null,
      });
      // Direction (approved 2026-09-12): "من حساب" is debited to us (US), "إلى حساب" is owed by us (THEM).
      await r.journalRepository.createMany([
        {
          movementId,
          lineNo: 1,
          clientId: input.fromClientId,
          currencyId: input.fromCurrencyId,
          amount: totals.totalUs,
          side: EntrySide.US,
          exchangeRate: input.fromExchangeRate,
          fees: input.feeUs ?? '0',
          feePercentage: input.feeUsPercentage ?? null,
          description: input.descriptionUs ?? null,
          movementDate: date,
          movementTime: time,
        },
        {
          movementId,
          lineNo: 2,
          clientId: input.toClientId,
          currencyId: input.toCurrencyId,
          amount: totals.totalThem,
          side: EntrySide.THEM,
          exchangeRate: input.toExchangeRate,
          fees: input.feeThem ?? '0',
          feePercentage: input.feeThemPercentage ?? null,
          description: input.descriptionThem ?? null,
          movementDate: date,
          movementTime: time,
        },
      ]);
      return detail;
    };
    return { typeId: type.id, totalResult: totals.result, persist };
  }
}
