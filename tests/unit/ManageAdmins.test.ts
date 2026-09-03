import { describe, expect, it, vi } from 'vitest';
import { ManageAdmins } from '../../src/application/use-cases/admins/ManageAdmins.js';
import { AdminRole } from '../../src/domain/enums/AdminRole.js';
const persisted: any = {
  id: '1',
  fullName: 'Admin',
  phone: null,
  email: null,
  passwordHash: 'hashed',
  role: AdminRole.ADMIN,
  permissions: [],
  isDeveloper: false,
  isActive: true,
};
describe('ManageAdmins', () => {
  it('hashes passwords and never returns passwordHash', async () => {
    const create = vi.fn().mockResolvedValue(persisted);
    const manager = new ManageAdmins({ create } as any, { hash: vi.fn().mockResolvedValue('hashed') } as any);
    const result = await manager.create({
      fullName: 'Admin',
      phone: null,
      email: null,
      password: 'secret123',
      role: AdminRole.ADMIN,
      permissions: [],
      isDeveloper: false,
      isActive: true,
    });
    expect(create.mock.calls[0][0].passwordHash).toBe('hashed');
    expect(result).not.toHaveProperty('passwordHash');
  });
  it('prevents self deactivation', async () => {
    const manager = new ManageAdmins({} as any, {} as any);
    await expect(manager.deactivate('1', '1')).rejects.toMatchObject({ code: 'CANNOT_DEACTIVATE_SELF' });
  });
});
