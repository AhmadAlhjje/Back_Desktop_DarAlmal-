import type { AdminRepository } from '../../ports/repositories/types.js';
import type { PasswordHasher } from '../../ports/services/PasswordHasher.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

/**
 * «تغيير كلمة المرور» للحساب الحالي (قرار المستخدم 2026-09-17):
 * يتحقق من كلمة المرور الحالية ثم يخزّن bcrypt hash للجديدة. لا تُسجَّل كلمات المرور ولا تُعاد أبداً.
 */
export class ChangeOwnPassword {
  constructor(
    private admins: AdminRepository,
    private hasher: PasswordHasher,
  ) {}
  async execute(actorId: string, currentPassword: string, newPassword: string) {
    const admin = await this.admins.findById(actorId);
    if (!admin?.isActive) throw new ApplicationError('ADMIN_NOT_FOUND', 'Admin not found', 404);
    if (!(await this.hasher.compare(currentPassword, admin.passwordHash)))
      throw new ApplicationError('INVALID_PASSWORD', 'Password mismatch', 401);
    if (currentPassword === newPassword)
      throw new ApplicationError('SAME_PASSWORD', 'The new password must differ from the current one', 422);
    await this.admins.update(actorId, { passwordHash: await this.hasher.hash(newPassword) });
    return { changed: true, id: actorId };
  }
}
