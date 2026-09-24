import { describe, expect, it } from 'vitest';
import { GetClientStatement } from '../../src/application/use-cases/journal/GetClientStatement.js';
import { EntrySide } from '../../src/domain/enums/EntrySide.js';
describe('GetClientStatement', () => {
  it('newest-first: running balance = closing minus effect of newer entries', async () => {
    const journal: any = {
      findStatementPage: async () => ({
        count: 3,
        opening: { us: '1000', them: '300' },
        beforePage: { us: '0', them: '100' },
        period: { us: '200', them: '150' },
        rows: [
          {
            id: '3',
            movementId: '3',
            movementNo: '3',
            movementTypeId: '1',
            movementTypeCode: 'PAYMENT',
            movementStatus: 'POSTED',
            lineNo: 1,
            clientId: '1',
            currencyId: '1',
            amount: '200',
            side: EntrySide.US,
            exchangeRate: null,
            fees: '0',
            feePercentage: null,
            description: null,
            movementDate: '2026-01-03',
            movementTime: '10:00:00',
          },
        ],
      }),
    };
    const clients: any = { findById: async () => ({ id: '1', code: 'C1', fullName: 'Client' }) };
    const currencies: any = { findById: async () => ({ id: '1', code: 'USD', name: 'Dollar', symbol: '$' }) };
    const result = await new GetClientStatement(journal, clients, currencies).execute({
      clientId: '1',
      currencyId: '1',
      page: 2,
      limit: 1,
    });
    expect(result.openingBalance).toBe('700.00');
    // الختامي 750؛ القيود الأحدث من الصفحة (THEM 100) تُطرح من أثرها ⇒ الرصيد بعد هذا القيد = 850.
    expect(result.entries[0].runningBalance).toBe('850.00');
    expect(result.closingBalance).toBe('750.00');
  });
});
