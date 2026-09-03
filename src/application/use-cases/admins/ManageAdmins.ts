import type { Admin } from '../../../domain/entities/Admin.js';
import type { AdminRole } from '../../../domain/enums/AdminRole.js';
import type { AdminRepository } from '../../ports/repositories/AdminRepository.js';
import type { PasswordHasher } from '../../ports/services/PasswordHasher.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
export interface AdminInput {
  fullName: string;
  phone: string | null;
  email: string | null;
  password: string;
  role: AdminRole;
  permissions: string[] | null;
  isDeveloper: boolean;
  isActive: boolean;
}
const safe = ({ passwordHash: _passwordHash, ...admin }: Admin) => admin;
export class ManageAdmins {
  constructor(
    private admins: AdminRepository,
    private hasher: PasswordHasher,
  ) {}
  async list(page: number, limit: number) {
    const r = await this.admins.findPage(page, limit);
    return { admins: r.rows.map(safe), pagination: { page, limit, total: r.count, pages: Math.ceil(r.count / limit) } };
  }
  async create(input: AdminInput) {
    const { password, ...fields } = input;
    const value = await this.admins.create({ ...fields, passwordHash: await this.hasher.hash(password) });
    return safe(value);
  }
  async update(id: string, input: Partial<AdminInput>) {
    const { password, ...fields } = input;
    const value = await this.admins.update(id, {
      ...fields,
      ...(password !== undefined && { passwordHash: await this.hasher.hash(password) }),
    });
    if (!value) throw new ApplicationError('ADMIN_NOT_FOUND', 'Admin not found', 404);
    return safe(value);
  }
  async deactivate(id: string, actorId: string) {
    if (id === actorId)
      throw new ApplicationError('CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own admin', 409);
    return this.update(id, { isActive: false });
  }
}
