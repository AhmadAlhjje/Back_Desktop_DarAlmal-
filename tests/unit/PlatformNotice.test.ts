import { describe, expect, it, vi } from 'vitest';
import { SystemNotice, SYSTEM_NOTICE_CODE } from '../../src/application/use-cases/platform/SystemNotice.js';
import { Login } from '../../src/application/use-cases/auth/Login.js';
import { noticeBlocks, NO_NOTICE } from '../../src/domain/entities/PlatformNotice.js';
import { authenticate } from '../../src/presentation/http/middleware/authenticate.js';
import type { LicenseMonitor } from '../../src/application/use-cases/license/LicenseMonitor.js';
import { ApplicationError } from '../../src/application/errors/ApplicationError.js';

/**
 * إعلان المنصّة (قرار المستخدم 2026-09-23): رسالة من لوحة التحكم تُوقف كل التطبيقات، **لكن**
 * من كان داخل التطبيق يُكمل عمله ولا تظهر له حتى يخرج ويعود أو يسجّل دخولاً جديداً —
 * لذلك تُفحص في تسجيل الدخول فقط، ولا تُفحص أبداً في `authenticate` (طلبات الجلسة الجارية).
 */
const notice = (over: Partial<{ isActive: boolean; title: string | null; message: string }> = {}) => ({
  isActive: true,
  title: 'صيانة',
  message: 'التطبيق متوقف مؤقتاً للصيانة',
  updatedAt: new Date(),
  ...over,
});

const repo = (value = notice()) => ({ get: vi.fn().mockResolvedValue(value), set: vi.fn(async (i) => ({ ...i, updatedAt: new Date() })) });

describe('platform notice', () => {
  it('only a notice that is active and has text blocks anything', () => {
    expect(noticeBlocks(notice())).toBe(true);
    expect(noticeBlocks(notice({ isActive: false }))).toBe(false);
    expect(noticeBlocks(notice({ message: '   ' }))).toBe(false);
    expect(noticeBlocks(NO_NOTICE)).toBe(false);
  });

  it('returns a 403 SYSTEM_NOTICE carrying the owner message', async () => {
    const service = new SystemNotice(repo(), 0);
    const error = await service.errorIfBlocking();
    expect(error).toBeInstanceOf(ApplicationError);
    expect(error!.code).toBe(SYSTEM_NOTICE_CODE);
    expect(error!.status).toBe(403);
    expect(error!.message).toBe('التطبيق متوقف مؤقتاً للصيانة');
    expect((error!.details as { title: string }).title).toBe('صيانة');
  });

  it('a database failure never blocks the apps', async () => {
    const service = new SystemNotice({ get: vi.fn().mockRejectedValue(new Error('db down')), set: vi.fn() }, 0);
    expect(await service.errorIfBlocking()).toBeNull();
  });

  it('caches reads and refreshes immediately after the dashboard writes', async () => {
    const r = repo();
    const service = new SystemNotice(r, 60_000);
    await service.current();
    await service.current();
    expect(r.get).toHaveBeenCalledTimes(1);
    await service.set({ isActive: false, title: null, message: '' });
    expect(await service.current()).toMatchObject({ isActive: false });
    expect(r.get).toHaveBeenCalledTimes(1);
  });

  it('login is refused while the notice is active — before the office or password are even checked', async () => {
    const offices = { findByCode: vi.fn(), findById: vi.fn(), setCode: vi.fn() };
    const admins = { findByFullName: vi.fn() };
    const login = new Login(
      offices as never,
      admins as never,
      { hash: vi.fn(), compare: vi.fn() } as never,
      { sign: vi.fn(), verify: vi.fn() } as never,
      { current: vi.fn() } as unknown as LicenseMonitor,
      { run: <T>(_id: string, fn: () => Promise<T>) => fn(), current: () => null } as never,
      { findActiveByKeyHash: vi.fn() } as never,
      { isActiveElsewhere: () => false },
      new SystemNotice(repo(), 0),
    );
    await expect(login.execute({ deviceKey: 'k', fullName: 'مدير', password: 'password1' })).rejects.toMatchObject({
      code: SYSTEM_NOTICE_CODE,
      status: 403,
    });
    expect(offices.findByCode).not.toHaveBeenCalled();
    expect(admins.findByFullName).not.toHaveBeenCalled();
  });

  it('login works normally once the notice is cancelled from the dashboard', async () => {
    const service = new SystemNotice(repo(notice({ isActive: false })), 0);
    expect(await service.errorIfBlocking()).toBeNull();
  });

  it('an open session is never interrupted: authenticate does not consult the notice', async () => {
    const source = (await import('node:fs')).readFileSync('src/presentation/http/middleware/authenticate.ts', 'utf8');
    expect(source.includes('SystemNotice')).toBe(false);
    expect(source.includes('notice')).toBe(false);
    expect(typeof authenticate).toBe('function');
  });
});
