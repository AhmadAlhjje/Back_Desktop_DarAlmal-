import { createHash, randomBytes } from 'node:crypto';
import type { AdminRepository } from '../../ports/repositories/AdminRepository.js';
import type { OfficeDeviceRepository } from '../../ports/repositories/OfficeDeviceRepository.js';
import type { OfficeRepository } from '../../ports/repositories/OfficeRepository.js';
import type { PasswordHasher } from '../../ports/services/PasswordHasher.js';
import type { TenantScope } from '../../ports/services/TenantScope.js';
import type { TokenService } from '../../ports/services/TokenService.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { LicenseMonitor } from '../license/LicenseMonitor.js';
import { licenseErrorFor } from '../license/licenseError.js';
import { normalizeOfficeCode, officePublicInfo, type Office } from '../../../domain/entities/Office.js';
import { generateOfficeCode } from '../platform/ManageOffices.js';

export interface LoginInput {
  /** كود المكتب — أول دخول على هذا الجهاز فقط (يُستهلك ويتولّد غيره). */
  officeCode?: string;
  /** مفتاح الجهاز الدائم — كل دخول لاحق. */
  deviceKey?: string;
  fullName: string;
  password: string;
}

/** تجزئة مفتاح الجهاز كما تُخزَّن (لا يُخزَّن المفتاح نفسه). */
export const hashDeviceKey = (key: string): string => createHash('sha256').update(key.trim()).digest('hex');

/**
 * تسجيل الدخول (تعدد المكاتب 2026-09-20 + الكود لمرة واحدة 2026-09-22):
 * - أول دخول على جهاز: كود المكتب + اسم المستخدم + كلمة المرور ⇒ يُصدَر للجهاز مفتاح دائم
 *   (يعود في الرد مرة واحدة) ويُستهلك الكود فيتولّد كود جديد يظهر في لوحة التحكم فقط.
 * - الدخول اللاحق: مفتاح الجهاز + اسم المستخدم + كلمة المرور (لا كود).
 * ترخيص المكتب يُفحص قبل كلمة المرور، والتوكن يحمل معرّف المكتب وكوده.
 */
export class Login {
  constructor(
    private offices: OfficeRepository,
    private admins: AdminRepository,
    private hasher: PasswordHasher,
    private tokens: TokenService,
    private license: LicenseMonitor,
    private scope: TenantScope,
    private devices: OfficeDeviceRepository,
    private codeGenerator: () => string = generateOfficeCode,
    private keyGenerator: () => string = () => randomBytes(32).toString('hex'),
  ) {}

  async execute(input: LoginInput) {
    const { office, enrolling } = await this.resolveOffice(input);
    const licenseError = licenseErrorFor(await this.license.current(office.id));
    if (licenseError) throw licenseError;

    const admin = await this.scope.run(office.id, () => this.admins.findByFullName(input.fullName));
    if (!admin?.isActive || !(await this.hasher.compare(input.password, admin.passwordHash)))
      throw new ApplicationError('INVALID_CREDENTIALS', 'Invalid full name or password', 401);

    let deviceKey: string | undefined;
    let current = office;
    if (enrolling) {
      // الكود صالح لتفعيل جهاز واحد: نُصدر مفتاحاً دائماً ثم نُبدّل الكود فوراً.
      deviceKey = this.keyGenerator();
      await this.devices.create({
        officeId: office.id,
        keyHash: hashDeviceKey(deviceKey),
        label: `${admin.fullName} — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
        enrolledBy: admin.id,
      });
      current = (await this.offices.setCode(office.id, await this.uniqueCode())) ?? office;
    }

    return {
      token: this.tokens.sign({
        adminId: admin.id,
        role: admin.role,
        permissions: admin.permissions ?? [],
        officeId: current.id,
        officeCode: current.code,
      }),
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions ?? [],
      },
      // اسم المكتب وعنوانه يحلّان محل «اسم/عنوان الشركة» في التطبيق (لا يعدّلهما المكتب).
      office: officePublicInfo(current),
      ...(deviceKey && { deviceKey }),
    };
  }

  /** المكتب من مفتاح الجهاز (دخول لاحق) أو من الكود (تفعيل أول). */
  private async resolveOffice(input: LoginInput): Promise<{ office: Office; enrolling: boolean }> {
    const deviceKey = input.deviceKey?.trim();
    if (deviceKey) {
      const device = await this.devices.findActiveByKeyHash(hashDeviceKey(deviceKey));
      if (!device) throw new ApplicationError('DEVICE_NOT_FOUND', 'هذا الجهاز غير مسجَّل — أدخل كود المكتب', 404);
      const office = await this.offices.findById(device.officeId);
      if (!office) throw new ApplicationError('OFFICE_NOT_FOUND', 'كود المكتب غير صحيح', 404);
      void this.devices.touch(device.id, new Date()).catch(() => undefined);
      return { office, enrolling: false };
    }
    const code = input.officeCode ? normalizeOfficeCode(input.officeCode) : '';
    if (!code) throw new ApplicationError('VALIDATION_ERROR', 'officeCode or deviceKey is required', 422);
    const office = await this.offices.findByCode(code);
    if (!office) throw new ApplicationError('OFFICE_NOT_FOUND', 'كود المكتب غير صحيح', 404);
    return { office, enrolling: true };
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = normalizeOfficeCode(this.codeGenerator());
      if (!(await this.offices.findByCode(code))) return code;
    }
    throw new ApplicationError('OFFICE_CODE_GENERATION_FAILED', 'Could not generate a unique office code', 500);
  }
}
