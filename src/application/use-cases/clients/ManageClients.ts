import type { Client } from '../../../domain/entities/Client.js';
import type { ClientRepository } from '../../ports/repositories/ClientRepository.js';
import type { ClientGroupRepository } from '../../ports/repositories/ClientGroupRepository.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
export class ManageClients {
  constructor(
    private clients: ClientRepository,
    private groups: ClientGroupRepository,
  ) {}
  async list(page: number, limit: number) {
    const r = await this.clients.findPage(page, limit);
    return { clients: r.rows, pagination: { page, limit, total: r.count, pages: Math.ceil(r.count / limit) } };
  }
  async update(id: string, input: Partial<Omit<Client, 'id'>>) {
    if (input.groupId && !(await this.groups.findById(input.groupId)))
      throw new ApplicationError('CLIENT_GROUP_NOT_FOUND', 'Client group not found', 404);
    const value = await this.clients.update(id, input);
    if (!value) throw new ApplicationError('CLIENT_NOT_FOUND', 'Client not found', 404);
    return value;
  }
}
