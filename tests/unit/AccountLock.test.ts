import { describe, expect, it, vi } from 'vitest';
import { authenticate, ADMIN_DEACTIVATED } from '../../src/presentation/http/middleware/authenticate.js';
import { NotificationHub } from '../../src/infrastructure/realtime/NotificationHub.js';
import { ApplicationError } from '../../src/application/errors/ApplicationError.js';
import type { LicenseMonitor } from '../../src/application/use-cases/license/LicenseMonitor.js';

/**
 * قرار المستخدم 2026-09-20: الإداري المعطَّل لا يستطيع فعل شيء حتى لو كانت جلسته مفتوحة —
 * كل طلب يتحقق من حالته في القاعدة (403 ADMIN_DEACTIVATED)، والتعطيل يُبثّ فوراً لأجهزته.
 */
const payload = { adminId: '4', role: 'ADMIN', permissions: [] as string[], officeId: '2', officeCode: 'ABCD2345' };
const tokens = { sign: vi.fn(), verify: vi.fn().mockReturnValue(payload) };
const activeLicense = { current: vi.fn().mockResolvedValue({ status: 'ACTIVE', expiresAt: null, message: null, checkedAt: new Date() }) } as unknown as LicenseMonitor;
const scope = { run: <T>(_id: string, fn: () => Promise<T>) => fn(), current: () => null };

const run = (isActive: boolean | null) =>
  new Promise<{ err: unknown; called: boolean }>((resolve) => {
    const admins = { findById: vi.fn().mockResolvedValue(isActive === null ? null : { id: '4', isActive }) } as never;
    let called = false;
    authenticate(tokens, activeLicense, scope, admins)(
      { header: () => 'Bearer x' } as never,
      {} as never,
      (err?: unknown) => {
        called = true;
        resolve({ err, called });
      },
    );
  });

describe('authenticate + admin status', () => {
  it('lets an active admin through', async () => {
    const { err } = await run(true);
    expect(err).toBeUndefined();
  });

  it('rejects a deactivated admin with 403 ADMIN_DEACTIVATED even with a valid token', async () => {
    const { err } = await run(false);
    expect(err).toBeInstanceOf(ApplicationError);
    expect((err as ApplicationError).code).toBe(ADMIN_DEACTIVATED);
    expect((err as ApplicationError).status).toBe(403);
    expect((err as ApplicationError).message).toContain('تعطيل');
  });

  it('rejects a deleted admin the same way', async () => {
    const { err } = await run(null);
    expect((err as ApplicationError).code).toBe(ADMIN_DEACTIVATED);
  });
});

describe('NotificationHub account channel', () => {
  it('delivers account state only to that admin and stops after unsubscribe', () => {
    const hub = new NotificationHub();
    const mine = vi.fn();
    const other = vi.fn();
    const off = hub.subscribeAccount('4', mine);
    hub.subscribeAccount('9', other);
    hub.publishAccount('4', { isActive: false });
    expect(mine).toHaveBeenCalledWith({ isActive: false });
    expect(other).not.toHaveBeenCalled();
    off();
    hub.publishAccount('4', { isActive: true });
    expect(mine).toHaveBeenCalledTimes(1);
  });
});

describe('single live session per account (2026-09-22)', () => {
  it('the hub tracks live streams per admin+device; another device is "elsewhere", the same device is not; release frees it', () => {
    const hub = new NotificationHub();
    expect(hub.isActiveElsewhere('4', 'devA')).toBe(false);
    const release = hub.claim('4', 'devA');
    expect(hub.isActiveElsewhere('4', 'devB')).toBe(true);
    expect(hub.isActiveElsewhere('4', 'devA')).toBe(false);
    expect(hub.isActiveElsewhere('4', undefined)).toBe(true);
    expect(hub.isActiveElsewhere('9', 'devB')).toBe(false);
    expect(hub.activeDevice('4')).toBe('devA');
    release();
    expect(hub.isActiveElsewhere('4', 'devB')).toBe(false);
    expect(hub.activeDevice('4')).toBeNull();
  });

  it('authenticate rejects requests from a device while another device holds the live session (409 ACCOUNT_IN_USE)', async () => {
    const hub = new NotificationHub();
    hub.claim('4', 'devA');
    const admins = { findById: vi.fn().mockResolvedValue({ id: '4', isActive: true }) } as never;
    const run = (deviceId: string | undefined) =>
      new Promise<unknown>((resolve) => {
        const t = { sign: vi.fn(), verify: vi.fn().mockReturnValue({ ...payload, deviceId }) };
        authenticate(t, activeLicense, scope, admins, hub)({ header: () => 'Bearer x' } as never, {} as never, (err?: unknown) => resolve(err));
      });
    expect(((await run('devB')) as ApplicationError).code).toBe('ACCOUNT_IN_USE');
    expect(((await run('devB')) as ApplicationError).status).toBe(409);
    expect(await run('devA')).toBeUndefined();
  });
});
