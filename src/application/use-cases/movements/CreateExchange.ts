import { EntrySide } from '../../../domain/enums/EntrySide.js';
import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { ExchangeCalculationService } from '../../../domain/services/ExchangeCalculationService.js';
import { Money } from '../../../domain/value-objects/Money.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { Clock } from '../../ports/services/Clock.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
import { movementTimestamp, newMovementId } from './helpers.js';
export interface CreateExchangeInput {
  clientId: string;
  fromCurrencyId: string;
  fromAmount: string;
  toCurrencyId: string;
  toAmount: string;
  exchangeRate: string;
  description?: string;
  profitLossClientId?: string;
  createdBy: string;
}
export class CreateExchange {
  constructor(
    private uow: UnitOfWork,
    private clock: Clock,
    private calculator = new ExchangeCalculationService(),
  ) {}
  execute(input: CreateExchangeInput) {
    return this.uow.execute(async (r) => {
      if (input.fromCurrencyId === input.toCurrencyId)
        throw new ApplicationError('SAME_CURRENCY', 'Exchange currencies must differ');
      Money.positive(input.fromAmount);
      Money.positive(input.toAmount);
      const [type, client, fromCurrency, toCurrency] = await Promise.all([
        r.movementTypeRepository.findByCode('EXCHANGE'),
        r.clientRepository.findById(input.clientId),
        r.currencyRepository.findById(input.fromCurrencyId),
        r.currencyRepository.findById(input.toCurrencyId),
      ]);
      if (!type?.isActive)
        throw new ApplicationError('MOVEMENT_TYPE_NOT_FOUND', 'Active EXCHANGE movement type not found', 404);
      if (!client) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
      if (input.profitLossClientId) {
        const pnl = await r.clientRepository.findById(input.profitLossClientId);
        if (!pnl) throw new ApplicationError('CLIENT_NOT_FOUND', 'Profit/loss account not found', 404);
        if (pnl.id === client.id)
          throw new ApplicationError('SAME_EXCHANGE_CLIENT', 'Profit/loss account must differ from the client', 422);
      }
      if (!fromCurrency?.isActive || !toCurrency?.isActive)
        throw new ApplicationError('CURRENCY_NOT_FOUND', 'Active currency not found', 404);
      const totals = this.calculator.calculate(input.fromAmount, input.toAmount, input.exchangeRate);
      const { date, time } = movementTimestamp(this.clock);
      const id = newMovementId();
      const movement = await r.movementRepository.create({
        id,
        movementNo: id,
        movementTypeId: type.id,
        clientId: input.clientId,
        description: input.description ?? null,
        movementDate: date,
        movementTime: time,
        totalResult: totals.profitLoss,
        status: MovementStatus.POSTED,
        createdBy: input.createdBy,
        updatedBy: null,
      });
      const detail = await r.exchangeRepository.create({
        movementId: id,
        clientId: input.clientId,
        fromCurrencyId: input.fromCurrencyId,
        fromAmount: input.fromAmount,
        toCurrencyId: input.toCurrencyId,
        toAmount: input.toAmount,
        exchangeRate: input.exchangeRate,
        profitLossClientId: input.profitLossClientId ?? null,
        ...totals,
      });
      await r.journalRepository.createMany([
        {
          movementId: id,
          lineNo: 1,
          clientId: input.clientId,
          currencyId: input.fromCurrencyId,
          amount: input.fromAmount,
          side: EntrySide.THEM,
          exchangeRate: input.exchangeRate,
          fees: '0',
          feePercentage: null,
          description: input.description ?? null,
          movementDate: date,
          movementTime: time,
        },
        {
          movementId: id,
          lineNo: 2,
          clientId: input.clientId,
          currencyId: input.toCurrencyId,
          amount: input.toAmount,
          side: EntrySide.US,
          exchangeRate: input.exchangeRate,
          fees: '0',
          feePercentage: null,
          description: input.description ?? null,
          movementDate: date,
          movementTime: time,
        },
      ]);
      return { movement, detail };
    });
  }
}
