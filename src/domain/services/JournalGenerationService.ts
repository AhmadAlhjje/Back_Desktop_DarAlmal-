import { EntrySide } from '../enums/EntrySide.js';
import type { JournalEntry } from '../entities/JournalEntry.js';
import type { Transfer } from '../entities/Transfer.js';
export class JournalGenerationService {
  forTransfer(transfer: Transfer, date: string, time: string): JournalEntry[] {
    return [
      {
        movementId: transfer.movementId,
        lineNo: 1,
        clientId: transfer.fromClientId,
        currencyId: transfer.fromCurrencyId,
        amount: transfer.totalUs,
        side: EntrySide.US,
        exchangeRate: transfer.fromExchangeRate,
        fees: transfer.feeUs,
        feePercentage: transfer.feeUsPercentage,
        description: transfer.descriptionUs,
        movementDate: date,
        movementTime: time,
      },
      {
        movementId: transfer.movementId,
        lineNo: 2,
        clientId: transfer.toClientId,
        currencyId: transfer.toCurrencyId,
        amount: transfer.totalThem,
        side: EntrySide.THEM,
        exchangeRate: transfer.toExchangeRate,
        fees: transfer.feeThem,
        feePercentage: transfer.feeThemPercentage,
        description: transfer.descriptionThem,
        movementDate: date,
        movementTime: time,
      },
    ];
  }
}
