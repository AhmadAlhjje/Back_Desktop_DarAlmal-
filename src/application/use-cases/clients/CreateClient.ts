import type { ClientRepository } from '../../ports/repositories/ClientRepository.js';
import type { ClientGroupRepository } from '../../ports/repositories/ClientGroupRepository.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { ClientInput } from '../../../domain/entities/Client.js';
export class CreateClient {
  constructor(
    private clients: ClientRepository,
    private groups: ClientGroupRepository,
  ) {}
  async execute(input: ClientInput) {
    if (input.groupId && !(await this.groups.findById(input.groupId)))
      throw new ApplicationError('CLIENT_GROUP_NOT_FOUND', 'Client group not found', 404);
    return this.clients.create(input);
  }
}
