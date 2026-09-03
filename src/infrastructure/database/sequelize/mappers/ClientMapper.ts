import type { Client } from '../../../../domain/entities/Client.js';
import type { ClientModel } from '../models/ClientModel.js';
export const ClientMapper = {
  toDomain(m: ClientModel): Client {
    return {
      id: m.id_client,
      code: m.client_code,
      groupId: m.group_id,
      fullName: m.full_name,
      phone: m.phone,
      email: m.email,
      address: m.address,
      importance: m.importance,
    };
  },
};
