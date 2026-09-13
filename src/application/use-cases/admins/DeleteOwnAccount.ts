import type { AdminRepository } from '../../ports/repositories/types.js';
import type { PasswordHasher } from '../../ports/services/PasswordHasher.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

/**
 * «حذف حسابي» (قرار ج7): تعطيل حساب الإداري الحالي بعد التحقق من كلمة المرور.
 * لا يُحذف الصف (يُحفظ التاريخ في created_by)، ويُمنع تعطيل آخر ADMIN نشط.
 */
export class DeleteOwnAccount {
  constructor(
    private admins: AdminRepository,
    private hasher: PasswordHasher,
  ) {}
  async execute(actorId: string, password: string) {
    const admin = await this.admins.findById(actorId);
    if (!admin?.isActive) throw new ApplicationError('ADMIN_NOT_FOUND', 'Admin not found', 404);
    if (!(await this.hasher.compare(password, admin.passwordHash)))
      throw new ApplicationError('INVALID_PASSWORD', 'Password mismatch', 401);
    if (admin.role === 'ADMIN') {
      const active = await this.admins.findAllActive();
      if (active.filter((a) => a.role === 'ADMIN').length <= 1)
        throw new ApplicationError('LAST_ADMIN', 'The last active ADMIN cannot delete their account', 409);
    }
    await this.admins.update(actorId, { isActive: false });
    return { deactivated: true, id: actorId };
  }
}
