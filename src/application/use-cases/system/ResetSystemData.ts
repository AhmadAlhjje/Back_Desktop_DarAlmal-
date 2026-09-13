import type { AdminRepository } from '../../ports/repositories/types.js';
import type { PasswordHasher } from '../../ports/services/PasswordHasher.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

/** عبارة التأكيد الإلزامية (قرار ج7 — معتمد 2026-09-13). */
export const RESET_CONFIRMATION_PHRASE = 'تصفير';

/**
 * تصفير البيانات التجارية كلها: الحركات وقيودها، الإشعارات، العملاء غير النظاميين ومجموعاتهم.
 * تبقى: الإداريون، العملات، أنواع الحركات، الصناديق النظامية. يتطلب دور ADMIN + كلمة المرور + العبارة.
 */
export class ResetSystemData {
  constructor(
    private uow: UnitOfWork,
    private admins: AdminRepository,
    private hasher: PasswordHasher,
  ) {}
  async execute(actorId: string, password: string, confirmation: string) {
    if (confirmation.trim() !== RESET_CONFIRMATION_PHRASE)
      throw new ApplicationError('RESET_CONFIRMATION_INVALID', 'Confirmation phrase mismatch', 422);
    const admin = await this.admins.findById(actorId);
    if (!admin?.isActive || admin.role !== 'ADMIN')
      throw new ApplicationError('FORBIDDEN', 'Only an active ADMIN can reset data', 403);
    if (!(await this.hasher.compare(password, admin.passwordHash)))
      throw new ApplicationError('INVALID_PASSWORD', 'Password mismatch', 401);
    return this.uow.execute((r) => r.systemRepository.resetBusinessData());
  }
}
