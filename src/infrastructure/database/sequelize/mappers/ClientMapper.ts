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
      accountType: m.account_type ?? 'CLIENT',
      isSystem: Boolean(m.is_system),
      isCashBox: Boolean(m.is_cash_box),
      isSecret: Boolean(m.is_secret),
      archivedAt: m.archived_at ? new Date(m.archived_at).toISOString() : null,
      lastRolloverAt: m.last_rollover_at ? new Date(m.last_rollover_at).toISOString() : null,
    };
  },
};
