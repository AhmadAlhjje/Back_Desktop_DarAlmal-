import { randomBytes } from 'node:crypto';
import type { LicenseStatus } from '../../../domain/entities/License.js';
import {
  OFFICE_CODE_ALPHABET,
  OFFICE_CODE_LENGTH,
  normalizeOfficeCode,
  type Office,
  type OfficePatch,
} from '../../../domain/entities/Office.js';
import { AdminRole } from '../../../domain/enums/AdminRole.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { OfficeRepository } from '../../ports/repositories/OfficeRepository.js';
import type { OfficeStats, PlatformStatsRepository } from '../../ports/repositories/PlatformStatsRepository.js';
import type { PasswordHasher } from '../../ports/services/PasswordHasher.js';
import type { TenantScope } from '../../ports/services/TenantScope.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';

/** كل الصلاحيات — لمدير المكتب الأول. */
export const ALL_PERMISSIONS: readonly string[] = [
  'admin.manage',
  'currency.manage',
  'client.create',
  'client.update',
  'movement.create',
  'movement.view',
  'movement.cancel',
  'movement.reverse',
  'journal.view',
];

/** العملات الأربع الأساسية والحسابان النظاميان — نفس بذور النظام، لكل مكتب جديد. */
const SYSTEM_CURRENCIES = [
  { name: 'دولار', code: 'USD', symbol: '$', textIcon: 'US', importance: 100000 },
  { name: 'ليرة سوري', code: 'SYP', symbol: 'ل.س', textIcon: 'SY', importance: 99999 },
  { name: 'يورو', code: 'EUR', symbol: '€', textIcon: 'EU', importance: 99998 },
  { name: 'ليرة تركي', code: 'TRY', symbol: '₺', textIcon: 'TR', importance: 99997 },
] as const;
const SYSTEM_ACCOUNTS = [
  { code: 'SYS-CASH', fullName: 'الصندوق الرئيسي', importance: 100000, isCashBox: true },
  { code: 'SYS-PNL', fullName: 'أرباح وخسائر التصريف', importance: 99999, isCashBox: false },
] as const;

export interface CreateOfficeInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  expiresAt?: Date | null;
  message?: string | null;
  /** مدير المكتب الأول: يُسلَّم للمكتب مع الكود. */
  admin: { fullName: string; password: string; phone?: string | null; email?: string | null };
}

export interface OfficeWithStats extends Office {
  stats: OfficeStats | null;
}

/** كود مكتب عشوائي من الأبجدية غير الملتبسة. */
export function generateOfficeCode(random: (n: number) => Uint8Array = (n) => randomBytes(n)): string {
  const bytes = random(OFFICE_CODE_LENGTH);
  return Array.from(bytes, (b) => OFFICE_CODE_ALPHABET[b % OFFICE_CODE_ALPHABET.length]).join('');
}

/**
 * إدارة المكاتب من لوحة التحكم (قرار المستخدم 2026-09-20): الإنشاء يولّد كوداً فريداً ويبذر في
 * معاملة واحدة العملات الأساسية والحسابين النظاميين ومدير المكتب الأول؛ الحالة/الانتهاء/الرسالة
 * تُحدَّث من هنا فيصل القفل أو يزول لدى المكتب خلال ثوانٍ (LicenseMonitor).
 */
export class ManageOffices {
  constructor(
    private offices: OfficeRepository,
    private stats: PlatformStatsRepository,
    private uow: UnitOfWork,
    private scope: TenantScope,
    private hasher: PasswordHasher,
    private codeGenerator: () => string = generateOfficeCode,
  ) {}

  async list(): Promise<OfficeWithStats[]> {
    const [offices, stats] = await Promise.all([this.offices.list(), this.stats.statsFor()]);
    const byOffice = new Map(stats.map((s) => [s.officeId, s]));
    return offices.map((o) => ({ ...o, stats: byOffice.get(o.id) ?? null }));
  }

  async get(id: string): Promise<OfficeWithStats> {
    const office = await this.offices.findById(id);
    if (!office) throw new ApplicationError('OFFICE_NOT_FOUND', 'Office not found', 404);
    const [stats] = await this.stats.statsFor([id]);
    return { ...office, stats: stats ?? null };
  }

  async create(input: CreateOfficeInput): Promise<Office> {
    const name = input.name.trim();
    if (!name) throw new ApplicationError('VALIDATION_ERROR', 'Office name is required', 422);
    const code = await this.uniqueCode();
    const passwordHash = await this.hasher.hash(input.admin.password);
    return this.uow.execute(async (r) => {
      const office = await r.officeRepository.create({
        code,
        name,
        status: 'ACTIVE',
        expiresAt: input.expiresAt ?? null,
        message: input.message?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      });
      // البذر داخل سياق المكتب الجديد: tenancy-hooks تختم كل صف بمعرّفه.
      await this.scope.run(office.id, async () => {
        for (const c of SYSTEM_CURRENCIES) {
          await r.currencyRepository.create({
            name: c.name,
            code: c.code,
            symbol: c.symbol,
            decimalPlaces: 2,
            iconPath: null,
            textIcon: c.textIcon,
            importance: c.importance,
            exchangeRate: '1.0000000000',
            exchangeType: 'FROM_USD_MULTIPLY',
            isActive: true,
            isSystem: true,
          });
        }
        for (const a of SYSTEM_ACCOUNTS) await r.clientRepository.createSystemAccount(a);
        await r.adminRepository.create({
          fullName: input.admin.fullName.trim(),
          phone: input.admin.phone?.trim() || null,
          email: input.admin.email?.trim() || null,
          passwordHash,
          role: AdminRole.ADMIN,
          permissions: [...ALL_PERMISSIONS],
          isDeveloper: false,
          isActive: true,
        });
      });
      return office;
    });
  }

  async update(id: string, patch: OfficePatch): Promise<Office> {
    const office = await this.offices.update(id, {
      ...patch,
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.message !== undefined && { message: patch.message?.trim() || null }),
    });
    if (!office) throw new ApplicationError('OFFICE_NOT_FOUND', 'Office not found', 404);
    return office;
  }

  /** تغيير حالة الترخيص (نشط/موقوف/منتهٍ) مع رسالة وتاريخ انتهاء اختياريين. */
  setLicense(id: string, license: { status: LicenseStatus; expiresAt?: Date | null; message?: string | null }): Promise<Office> {
    return this.update(id, { status: license.status, expiresAt: license.expiresAt ?? null, message: license.message ?? null });
  }

  /** إعادة توليد كود المكتب (ضاع الكود): الجلسات المفتوحة تستمر (التوكن بمعرّف المكتب)، والدخول التالي بالكود الجديد. */
  /**
   * لوغو المكتب من اللوحة (قرار المستخدم 2026-09-21): يُبدَّل متى شاء المالك — بخلاف التطبيق حيث
   * يُعيَّن مرة واحدة. يعيد المسار السابق ليحذفه المستدعي من القرص.
   */
  async setLogo(id: string, logoPath: string | null): Promise<{ office: Office; previousPath: string | null }> {
    const current = await this.offices.findById(id);
    if (!current) throw new ApplicationError('OFFICE_NOT_FOUND', 'Office not found', 404);
    const office = await this.offices.update(id, { logoPath, logoUpdatedAt: logoPath ? new Date() : null });
    if (!office) throw new ApplicationError('OFFICE_NOT_FOUND', 'Office not found', 404);
    return { office, previousPath: current.logoPath };
  }

  async regenerateCode(id: string): Promise<Office> {
    if (!(await this.offices.findById(id))) throw new ApplicationError('OFFICE_NOT_FOUND', 'Office not found', 404);
    const office = await this.offices.setCode(id, await this.uniqueCode());
    if (!office) throw new ApplicationError('OFFICE_NOT_FOUND', 'Office not found', 404);
    return office;
  }

  /** كود فريد: يعيد التوليد عند تصادم نادر. */
  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = normalizeOfficeCode(this.codeGenerator());
      if (!(await this.offices.findByCode(code))) return code;
    }
    throw new ApplicationError('OFFICE_CODE_GENERATION_FAILED', 'Could not generate a unique office code', 500);
  }
}
