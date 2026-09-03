import type { ClientGroup } from '../../../domain/entities/ClientGroup.js';
import type { ClientGroupRepository } from '../../ports/repositories/ClientGroupRepository.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
export class ManageClientGroups {
  constructor(private groups: ClientGroupRepository) {}
  async list(page: number, limit: number) {
    const r = await this.groups.findPage(page, limit);
    return { groups: r.rows, pagination: { page, limit, total: r.count, pages: Math.ceil(r.count / limit) } };
  }
  create(input: Omit<ClientGroup, 'id'>) {
    return this.groups.create(input);
  }
  async update(id: string, input: Partial<Omit<ClientGroup, 'id'>>) {
    const value = await this.groups.update(id, input);
    if (!value) throw new ApplicationError('CLIENT_GROUP_NOT_FOUND', 'Client group not found', 404);
    return value;
  }
}
