import { AdminRole } from '../../../../domain/enums/AdminRole.js';
import type { Admin } from '../../../../domain/entities/Admin.js';
import type { AdminModel } from '../models/AdminModel.js';
export const AdminMapper = {
  toDomain(m: AdminModel): Admin {
    return {
      id: m.id_admin,
      fullName: m.full_name,
      phone: m.phone,
      email: m.email,
      passwordHash: m.password_hash,
      role: m.role as AdminRole,
      permissions: m.permissions,
      isDeveloper: m.is_developer,
      isActive: m.is_active,
    };
  },
};
