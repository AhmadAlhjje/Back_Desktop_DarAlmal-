import type { AdminRepository } from '../../ports/repositories/AdminRepository.js';
import type { PasswordHasher } from '../../ports/services/PasswordHasher.js';
import type { TokenService } from '../../ports/services/TokenService.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
export class Login {
  constructor(
    private admins: AdminRepository,
    private hasher: PasswordHasher,
    private tokens: TokenService,
  ) {}
  async execute(fullName: string, password: string) {
    const admin = await this.admins.findByFullName(fullName);
    if (!admin?.isActive || !(await this.hasher.compare(password, admin.passwordHash)))
      throw new ApplicationError('INVALID_CREDENTIALS', 'Invalid full name or password', 401);
    return {
      token: this.tokens.sign({ adminId: admin.id, role: admin.role, permissions: admin.permissions ?? [] }),
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions ?? [],
      },
    };
  }
}
