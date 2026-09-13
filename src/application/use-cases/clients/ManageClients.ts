import { Decimal } from 'decimal.js';
import type { Client, ClientInput } from '../../../domain/entities/Client.js';
import { BalanceValuationService } from '../../../domain/services/BalanceValuationService.js';
import type { ClientRepository, ClientListFilters } from '../../ports/repositories/types.js';
import type { ClientGroupRepository } from '../../ports/repositories/ClientGroupRepository.js';
import type { ReportsRepository } from '../../ports/repositories/ReportsRepository.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

/**
 * إدارة العملاء/الصناديق وأعلامها (قرارات ج1/ج2/د1/د3 — معتمدة 2026-09-13):
 * - الأرشفة تتطلب رصيداً صفرياً في كل العملات، ولا تُطبَّق على الحسابات النظامية.
 * - الحذف الفعلي للحساب ممنوع إن كان له أي قيد يومية (تاريخ مالي) أو كان نظامياً.
 * - حساب الصندوق واحد فقط؛ الحساب السرّي يظهر لدور ADMIN فقط.
 * - «تدوير الأرصدة» يثبّت نقطة بداية فترة كشف الحساب (last_rollover_at) دون أي قيود.
 */
export class ManageClients {
  constructor(
    private clients: ClientRepository,
    private groups: ClientGroupRepository,
    private reports: ReportsRepository,
    private valuation = new BalanceValuationService(),
  ) {}
  async list(page: number, limit: number, filters: ClientListFilters = {}) {
    const r = await this.clients.findPage(page, limit, filters);
    return { clients: r.rows, pagination: { page, limit, total: r.count, pages: Math.ceil(r.count / limit) } };
  }
  async update(id: string, input: Partial<ClientInput>) {
    if (input.groupId && !(await this.groups.findById(input.groupId)))
      throw new ApplicationError('CLIENT_GROUP_NOT_FOUND', 'Client group not found', 404);
    const current = await this.require(id);
    if (current.isSystem && (input.code !== undefined || input.accountType !== undefined))
      throw new ApplicationError('SYSTEM_CLIENT_PROTECTED', 'System accounts cannot change code or type', 409);
    const value = await this.clients.update(id, input);
    if (!value) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    return value;
  }
  async archive(id: string, archived: boolean) {
    const client = await this.require(id);
    if (archived) {
      if (client.isSystem)
        throw new ApplicationError('SYSTEM_CLIENT_PROTECTED', 'System accounts cannot be archived', 409);
      if (await this.hasNonZeroBalance(id))
        throw new ApplicationError(
          'ARCHIVE_NON_ZERO_BALANCE',
          'Client balances must be zero in every currency before archiving',
          409,
        );
    }
    const value = await this.clients.setArchived(id, archived ? new Date() : null);
    return value ?? client;
  }
  async setCashBox(id: string) {
    const client = await this.require(id);
    if (client.archivedAt)
      throw new ApplicationError('CLIENT_ARCHIVED', 'Archived accounts cannot be the cash box', 409);
    const value = await this.clients.setCashBox(id);
    return value ?? client;
  }
  async setSecret(id: string, isSecret: boolean) {
    await this.require(id);
    const value = await this.clients.setSecret(id, isSecret);
    if (!value) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    return value;
  }
  async rollover(id: string) {
    await this.require(id);
    const value = await this.clients.setLastRollover(id, new Date());
    if (!value) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    return value;
  }
  async delete(id: string) {
    const client = await this.require(id);
    if (client.isSystem)
      throw new ApplicationError('SYSTEM_CLIENT_PROTECTED', 'System accounts cannot be deleted', 409);
    if ((await this.clients.countJournalEntries(id)) > 0)
      throw new ApplicationError('CLIENT_HAS_MOVEMENTS', 'Client has journal entries and cannot be deleted', 409);
    await this.clients.delete(id);
    return { deleted: true, id };
  }
  async cashBox() {
    return this.clients.findCashBox();
  }
  private async require(id: string): Promise<Client> {
    const client = await this.clients.findById(id);
    if (!client) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    return client;
  }
  private async hasNonZeroBalance(id: string) {
    const rows = await this.reports.clientBalances(id);
    return rows.some((r) => new Decimal(this.valuation.net(r.totalUs, r.totalThem)).isZero() === false);
  }
}
