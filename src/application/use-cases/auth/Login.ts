import type { AdminRepository } from '../../ports/repositories/AdminRepository.js';
import type { OfficeRepository } from '../../ports/repositories/OfficeRepository.js';
import type { PasswordHasher } from '../../ports/services/PasswordHasher.js';
import type { TenantScope } from '../../ports/services/TenantScope.js';
import type { TokenService } from '../../ports/services/TokenService.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { LicenseMonitor } from '../license/LicenseMonitor.js';
import { licenseErrorFor } from '../license/licenseError.js';
import { normalizeOfficeCode } from '../../../domain/entities/Office.js';

/**
 * تسجيل الدخول (تعدد المكاتب 2026-09-20): كود المكتب + اسم المستخدم + كلمة المرور.
 * الكود يحدّد المكتب، ترخيصه يُفحص قبل كلمة المرور، والتوكن يحمل معرّف المكتب وكوده.
 */
export class Login {
  constructor(
    private offices: OfficeRepository,
    private admins: AdminRepository,
    private hasher: PasswordHasher,
    private tokens: TokenService,
    private license: LicenseMonitor,
    private scope: TenantScope,
  ) {}

  async execute(officeCode: string, fullName: string, password: string) {
    const office = await this.offices.findByCode(normalizeOfficeCode(officeCode));
    if (!office) throw new ApplicationError('OFFICE_NOT_FOUND', 'كود المكتب غير صحيح', 404);
    const licenseError = licenseErrorFor(await this.license.current(office.id));
    if (licenseError) throw licenseError;

    const admin = await this.scope.run(office.id, () => this.admins.findByFullName(fullName));
    if (!admin?.isActive || !(await this.hasher.compare(password, admin.passwordHash)))
      throw new ApplicationError('INVALID_CREDENTIALS', 'Invalid full name or password', 401);
    return {
      token: this.tokens.sign({
        adminId: admin.id,
        role: admin.role,
        permissions: admin.permissions ?? [],
        officeId: office.id,
        officeCode: office.code,
      }),
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions ?? [],
      },
      // اسم المكتب وعنوانه يحلّان محل «اسم/عنوان الشركة» في التطبيق (لا يعدّلهما المكتب).
      office: { id: office.id, code: office.code, name: office.name, address: office.address, phone: office.phone },
    };
  }
}
