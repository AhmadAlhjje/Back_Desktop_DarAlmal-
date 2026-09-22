import { describe, expect, it, vi } from 'vitest';
import { ManageClients } from '../../src/application/use-cases/clients/ManageClients.js';
import { NotifyAdmins } from '../../src/application/use-cases/notifications/NotifyAdmins.js';
import { ResetSystemData } from '../../src/application/use-cases/system/ResetSystemData.js';
import { DeleteOwnAccount } from '../../src/application/use-cases/admins/DeleteOwnAccount.js';

const client = (over: Record<string, unknown> = {}): any => ({
  id: '7',
  code: 'CL-1',
  groupId: null,
  fullName: 'عميل',
  phone: null,
  email: null,
  address: null,
  importance: 0,
  accountType: 'CLIENT',
  isSystem: false,
  isCashBox: false,
  isSecret: false,
  archivedAt: null,
  lastRolloverAt: null,
  ...over,
});
const balanceRow = (us: string, them: string): any => ({
  clientId: '7',
  currencyId: '1',
  totalUs: us,
  totalThem: them,
  exchangeRate: '1',
  exchangeType: 'FROM_USD_MULTIPLY',
});
const manager = (clients: Record<string, unknown>, reports: Record<string, unknown> = {}) =>
  new ManageClients(clients as any, {} as any, reports as any);

describe('ManageClients — archive', () => {
  it('rejects archiving while any currency balance is non-zero', async () => {
    const m = manager(
      { findById: vi.fn().mockResolvedValue(client()) },
      { clientBalances: vi.fn().mockResolvedValue([balanceRow('100', '100'), balanceRow('0.0001', '0')]) },
    );
    await expect(m.archive('7', true)).rejects.toMatchObject({ code: 'ARCHIVE_NON_ZERO_BALANCE', status: 409 });
  });
  it('archives when every balance is zero and clears the cash-box flag', async () => {
    const setArchived = vi.fn().mockResolvedValue(client({ archivedAt: '2026-09-13T00:00:00.000Z' }));
    const m = manager(
      { findById: vi.fn().mockResolvedValue(client()), setArchived },
      { clientBalances: vi.fn().mockResolvedValue([balanceRow('50', '50')]) },
    );
    const out = await m.archive('7', true);
    expect(setArchived).toHaveBeenCalledWith('7', expect.any(Date));
    expect(out.archivedAt).not.toBeNull();
  });
  it('never archives a system account', async () => {
    const m = manager({ findById: vi.fn().mockResolvedValue(client({ isSystem: true })) });
    await expect(m.archive('7', true)).rejects.toMatchObject({ code: 'SYSTEM_CLIENT_PROTECTED' });
  });
  it('unarchive does not check balances', async () => {
    const setArchived = vi.fn().mockResolvedValue(client());
    const m = manager({ findById: vi.fn().mockResolvedValue(client({ archivedAt: 'x' })), setArchived });
    await m.archive('7', false);
    expect(setArchived).toHaveBeenCalledWith('7', null);
  });
});

describe('ManageClients — delete / cash box / rollover', () => {
  it('refuses to delete an account with journal history', async () => {
    const m = manager({
      findById: vi.fn().mockResolvedValue(client()),
      countJournalEntries: vi.fn().mockResolvedValue(3),
    });
    await expect(m.delete('7')).rejects.toMatchObject({ code: 'CLIENT_HAS_MOVEMENTS', status: 409 });
  });
  it('refuses to delete a system account', async () => {
    const m = manager({ findById: vi.fn().mockResolvedValue(client({ isSystem: true })) });
    await expect(m.delete('7')).rejects.toMatchObject({ code: 'SYSTEM_CLIENT_PROTECTED' });
  });
  it('deletes an unused account', async () => {
    const del = vi.fn().mockResolvedValue(true);
    const m = manager({
      findById: vi.fn().mockResolvedValue(client()),
      countJournalEntries: vi.fn().mockResolvedValue(0),
      delete: del,
    });
    // الاسم يعود مع النتيجة ليُذكر في إشعار الحذف (2026-09-22)
    await expect(m.delete('7')).resolves.toEqual({ deleted: true, id: '7', fullName: 'عميل' });
    expect(del).toHaveBeenCalledWith('7');
  });
  it('archived accounts cannot become the cash box', async () => {
    const m = manager({ findById: vi.fn().mockResolvedValue(client({ archivedAt: 'x' })) });
    await expect(m.setCashBox('7')).rejects.toMatchObject({ code: 'CLIENT_ARCHIVED' });
  });
  it('rollover stamps last_rollover_at', async () => {
    const setLastRollover = vi.fn().mockResolvedValue(client({ lastRolloverAt: 'now' }));
    const m = manager({ findById: vi.fn().mockResolvedValue(client()), setLastRollover });
    const out = await m.rollover('7');
    expect(setLastRollover).toHaveBeenCalledWith('7', expect.any(Date));
    expect(out.lastRolloverAt).toBe('now');
  });
  it('system accounts cannot change code or type', async () => {
    const m = manager({ findById: vi.fn().mockResolvedValue(client({ isSystem: true })) });
    await expect(m.update('7', { code: 'X' })).rejects.toMatchObject({ code: 'SYSTEM_CLIENT_PROTECTED' });
  });
});

describe('NotifyAdmins', () => {
  it('creates one notification per active admin and never throws', async () => {
    const create = vi.fn().mockResolvedValue({});
    const notify = new NotifyAdmins(
      { findAllActive: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]) } as any,
      { create } as any,
      { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    );
    const count = await notify.execute({ type: 'MOVEMENT', title: 'ت', message: 'م', movementId: '9' });
    expect(count).toBe(2);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0]).toMatchObject({ adminId: '2', isRead: false, movementId: '9' });
  });
  it('swallows repository failures', async () => {
    const error = vi.fn();
    const notify = new NotifyAdmins(
      { findAllActive: vi.fn().mockRejectedValue(new Error('db down')) } as any,
      {} as any,
      { info: vi.fn(), warn: vi.fn(), error },
    );
    await expect(notify.execute({ type: 'SYSTEM', title: 'x', message: 'y' })).resolves.toBe(0);
    expect(error).toHaveBeenCalled();
  });
});

describe('ResetSystemData / DeleteOwnAccount', () => {
  const admin = (over: Record<string, unknown> = {}): any => ({
    id: '1',
    role: 'ADMIN',
    isActive: true,
    passwordHash: 'h',
    ...over,
  });
  it('requires the exact confirmation phrase and the password', async () => {
    const uow = { execute: vi.fn() };
    const reset = new ResetSystemData(
      uow as any,
      { findById: vi.fn().mockResolvedValue(admin()) } as any,
      { compare: vi.fn().mockResolvedValue(false) } as any,
    );
    await expect(reset.execute('1', 'pw', 'لا')).rejects.toMatchObject({ code: 'RESET_CONFIRMATION_INVALID' });
    await expect(reset.execute('1', 'pw', 'تصفير')).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
    expect(uow.execute).not.toHaveBeenCalled();
  });
  it('runs the reset inside the unit of work for an ADMIN with a valid password', async () => {
    const summary = { journalEntries: 2, movements: 1, notifications: 0, clients: 1, clientGroups: 0 };
    const uow = { execute: vi.fn(async (work: any) => work({ systemRepository: { resetBusinessData: async () => summary } })) };
    const reset = new ResetSystemData(
      uow as any,
      { findById: vi.fn().mockResolvedValue(admin()) } as any,
      { compare: vi.fn().mockResolvedValue(true) } as any,
    );
    await expect(reset.execute('1', 'pw', 'تصفير')).resolves.toEqual(summary);
  });
  it('non-ADMIN roles cannot reset', async () => {
    const reset = new ResetSystemData(
      { execute: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue(admin({ role: 'MANAGER' })) } as any,
      { compare: vi.fn().mockResolvedValue(true) } as any,
    );
    await expect(reset.execute('1', 'pw', 'تصفير')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('the last active ADMIN cannot delete their own account', async () => {
    const del = new DeleteOwnAccount(
      { findById: vi.fn().mockResolvedValue(admin()), findAllActive: vi.fn().mockResolvedValue([admin()]) } as any,
      { compare: vi.fn().mockResolvedValue(true) } as any,
    );
    await expect(del.execute('1', 'pw')).rejects.toMatchObject({ code: 'LAST_ADMIN' });
  });
  it('deactivates (never deletes) the account when another ADMIN remains', async () => {
    const update = vi.fn().mockResolvedValue(admin({ isActive: false }));
    const del = new DeleteOwnAccount(
      {
        findById: vi.fn().mockResolvedValue(admin()),
        findAllActive: vi.fn().mockResolvedValue([admin(), admin({ id: '2' })]),
        update,
      } as any,
      { compare: vi.fn().mockResolvedValue(true) } as any,
    );
    await expect(del.execute('1', 'pw')).resolves.toEqual({ deactivated: true, id: '1' });
    expect(update).toHaveBeenCalledWith('1', { isActive: false });
  });
});
