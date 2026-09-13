import { BalanceValuationService } from '../../../domain/services/BalanceValuationService.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { ClientRepository } from '../../ports/repositories/types.js';
import type { ReportsRepository } from '../../ports/repositories/ReportsRepository.js';

/** أرصدة عميل لكل عملة + الرصيد المقوّم بالدولار (الحساب كله في الباك اند). */
export class GetClientBalances {
  constructor(
    private reports: ReportsRepository,
    private clients: ClientRepository,
    private valuation = new BalanceValuationService(),
  ) {}
  async execute(clientId: string, asOf?: string) {
    const client = await this.clients.findById(clientId);
    if (!client) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    const rows = await this.reports.clientBalances(clientId, asOf);
    const balances = rows.map((r) => {
      const balance = this.valuation.net(r.totalUs, r.totalThem);
      return {
        currency: {
          id: r.currencyId,
          code: r.currencyCode,
          name: r.currencyName,
          symbol: r.currencySymbol,
          decimalPlaces: r.decimalPlaces,
          exchangeRate: r.exchangeRate,
          exchangeType: r.exchangeType,
        },
        totalUs: r.totalUs,
        totalThem: r.totalThem,
        balance,
        valuedUsd: this.valuation.toUsd(balance, r.exchangeRate, r.exchangeType),
      };
    });
    return {
      client: { id: client.id, code: client.code, fullName: client.fullName },
      asOf: asOf ?? null,
      balances,
      totalValuedUsd: this.valuation.sum(balances.map((b) => b.valuedUsd)),
    };
  }
}
