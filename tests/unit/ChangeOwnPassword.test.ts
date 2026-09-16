import { describe, expect, it, vi } from 'vitest';
import { ChangeOwnPassword } from '../../src/application/use-cases/admins/ChangeOwnPassword.js';

const admin = { id: '3', fullName: 'عدنان', role: 'ADMIN', isActive: true, passwordHash: 'HASH(old)' };

function make(over: Record<string, unknown> = {}) {
  const admins: any = { findById: vi.fn().mockResolvedValue({ ...admin, ...over }), update: vi.fn() };
  const hasher: any = {
    compare: vi.fn(async (plain: string, hash: string) => hash === `HASH(${plain})`),
    hash: vi.fn(async (plain: string) => `HASH(${plain})`),
  };
  return { admins, hasher, useCase: new ChangeOwnPassword(admins, hasher) };
}

describe('ChangeOwnPassword', () => {
  it('stores a bcrypt hash of the new password after verifying the current one', async () => {
    const { admins, useCase } = make();
    await expect(useCase.execute('3', 'old', 'brand-new-pass')).resolves.toEqual({ changed: true, id: '3' });
    expect(admins.update).toHaveBeenCalledWith('3', { passwordHash: 'HASH(brand-new-pass)' });
    // لا كلمة مرور صريحة تُمرَّر إلى المستودع.
    expect(JSON.stringify(admins.update.mock.calls[0][1])).not.toContain('brand-new-pass'.slice(0, 5) + '"');
  });

  it('rejects a wrong current password without touching the account', async () => {
    const { admins, useCase } = make();
    await expect(useCase.execute('3', 'wrong', 'brand-new-pass')).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
    expect(admins.update).not.toHaveBeenCalled();
  });

  it('rejects reusing the same password and unknown/inactive accounts', async () => {
    const { useCase } = make();
    await expect(useCase.execute('3', 'old', 'old')).rejects.toMatchObject({ code: 'SAME_PASSWORD' });
    const inactive = make({ isActive: false });
    await expect(inactive.useCase.execute('3', 'old', 'new-pass-1')).rejects.toMatchObject({ code: 'ADMIN_NOT_FOUND' });
  });
});
