import type { Admin } from '../../../domain/entities/Admin.js';
import { AdminRole } from '../../../domain/enums/AdminRole.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { AdminRepository } from '../../ports/repositories/AdminRepository.js';
import type { OfficeRepository } from '../../ports/repositories/OfficeRepository.js';
import type { PasswordHasher } from '../../ports/services/PasswordHasher.js';
import type { TenantScope } from '../../ports/services/TenantScope.js';
import { ALL_PERMISSIONS } from './ManageOffices.js';

export type SafeAdmin = Omit<Admin, 'passwordHash'>;
const safe = ({ passwordHash: _passwordHash, ...admin }: Admin): SafeAdmin => admin;

/**
 * إداريو مكتب معيّن من لوحة التحكم: عرض، إضافة، إعادة تعيين كلمة المرور، تعطيل/تفعيل.
 * كل عملية تُنفَّذ داخل سياق ذلك المكتب فلا يمكن أن تمسّ إداري مكتب آخر ولو تطابق المعرّف.
 */
export class ManageOfficeAdmins {
  constructor(
    private offices: OfficeRepository,
    private admins: AdminRepository,
    private hasher: PasswordHasher,
    private scope: TenantScope,
  ) {}

  private async inOffice<T>(officeId: string, fn: () => Promise<T>): Promise<T> {
    if (!(await this.offices.findById(officeId))) throw new ApplicationError('OFFICE_NOT_FOUND', 'Office not found', 404);
    return this.scope.run(officeId, fn);
  }

  list(officeId: string): Promise<SafeAdmin[]> {
    return this.inOffice(officeId, async () => (await this.admins.findPage(1, 500)).rows.map(safe));
  }

  create(
    officeId: string,
    input: { fullName: string; password: string; phone?: string | null; email?: string | null; role?: AdminRole },
  ): Promise<SafeAdmin> {
    return this.inOffice(officeId, async () => {
      const role = input.role ?? AdminRole.ADMIN;
      const admin = await this.admins.create({
        fullName: input.fullName.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        passwordHash: await this.hasher.hash(input.password),
        role,
        permissions: role === AdminRole.ADMIN ? [...ALL_PERMISSIONS] : [],
        isDeveloper: false,
        isActive: true,
      });
      return safe(admin);
    });
  }

  resetPassword(officeId: string, adminId: string, password: string): Promise<SafeAdmin> {
    return this.inOffice(officeId, async () => {
      const admin = await this.admins.update(adminId, { passwordHash: await this.hasher.hash(password) });
      if (!admin) throw new ApplicationError('ADMIN_NOT_FOUND', 'Admin not found', 404);
      return safe(admin);
    });
  }

  setActive(officeId: string, adminId: string, isActive: boolean): Promise<SafeAdmin> {
    return this.inOffice(officeId, async () => {
      const admin = await this.admins.update(adminId, { isActive });
      if (!admin) throw new ApplicationError('ADMIN_NOT_FOUND', 'Admin not found', 404);
      return safe(admin);
    });
  }
}
