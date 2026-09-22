import { describe, expect, it, vi } from 'vitest';
import { ManageOffices } from '../../src/application/use-cases/platform/ManageOffices.js';

/**
 * حذف مكتب من لوحة التحكم (قرار المستخدم 2026-09-23): «يمكن حذف مكتب معين لكن تظهر نافذة تطلب
 * التأكيد لأنه شيء مهم» — التأكيد هو كود المكتب نفسه، فلا يُحذف مكتب بالخطأ، والحذف يمسح كل
 * بياناته في معاملة واحدة.
 */
const office = { id: '5', code: 'ABCD2345', name: 'مكتب حلب', logoPath: 'uploads/offices/o5.png' };

function make() {
  const purgeOffice = vi.fn(async () => ({
    journalEntries: 40,
    movements: 20,
    notifications: 7,
    clients: 9,
    clientGroups: 2,
    currencies: 4,
    admins: 3,
    devices: 1,
  }));
  const offices: any = { findById: vi.fn(async (id: string) => (id === office.id ? office : null)) };
  const uow: any = { execute: vi.fn(async (fn: (r: unknown) => unknown) => fn({ systemRepository: { purgeOffice } })) };
  const manage = new ManageOffices(offices, {} as never, uow, { run: <T>(_id: string, fn: () => T) => fn() } as never, {} as never);
  return { manage, purgeOffice, offices };
}

describe('deleting an office', () => {
  it('refuses without the exact office code and touches nothing', async () => {
    const { manage, purgeOffice } = make();
    await expect(manage.delete('5', 'نعم')).rejects.toMatchObject({ code: 'OFFICE_DELETE_CONFIRMATION_INVALID', status: 422 });
    await expect(manage.delete('5', '')).rejects.toMatchObject({ code: 'OFFICE_DELETE_CONFIRMATION_INVALID' });
    expect(purgeOffice).not.toHaveBeenCalled();
  });

  it('accepts the code in any spacing/case and purges all of the office data in one transaction', async () => {
    const { manage, purgeOffice } = make();
    const result = await manage.delete('5', ' abcd-2345 ');
    expect(purgeOffice).toHaveBeenCalledWith('5');
    expect(result.office.code).toBe('ABCD2345');
    expect(result.summary).toMatchObject({ movements: 20, clients: 9, admins: 3, devices: 1 });
  });

  it('a missing office is a 404, not a silent success', async () => {
    const { manage, purgeOffice } = make();
    await expect(manage.delete('99', 'ABCD2345')).rejects.toMatchObject({ code: 'OFFICE_NOT_FOUND', status: 404 });
    expect(purgeOffice).not.toHaveBeenCalled();
  });
});
