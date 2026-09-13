import { AdminRole } from '../../../../domain/enums/AdminRole.js';
import type { Admin } from '../../../../domain/entities/Admin.js';
import type { AdminModel } from '../models/AdminModel.js';
// MariaDB stores JSON as LONGTEXT, so Sequelize may hand the column back as a raw string.
const parsePermissions = (value: unknown): string[] | null => {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }
  return null;
};
export const AdminMapper = {
  toDomain(m: AdminModel): Admin {
    return {
      id: m.id_admin,
      fullName: m.full_name,
      phone: m.phone,
      email: m.email,
      passwordHash: m.password_hash,
      role: m.role as AdminRole,
      permissions: parsePermissions(m.permissions),
      isDeveloper: m.is_developer,
      isActive: m.is_active,
    };
  },
};
