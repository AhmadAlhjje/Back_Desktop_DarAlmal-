import { describe, expect, it, vi } from 'vitest';
import { effectiveLicenseStatus, toLicenseState, type LicenseFields } from '../../src/domain/entities/License.js';
import { LicenseMonitor } from '../../src/application/use-cases/license/LicenseMonitor.js';
import { licenseErrorFor } from '../../src/application/use-cases/license/licenseError.js';
import { ApplicationError } from '../../src/application/errors/ApplicationError.js';
import type { OfficeRepository } from '../../src/application/ports/repositories/OfficeRepository.js';
import type { Office } from '../../src/domain/entities/Office.js';

const at = (iso: string) => new Date(iso);
const fields = (o: Partial<LicenseFields> = {}): LicenseFields => ({ status: 'ACTIVE', expiresAt: null, message: null, movementLimit: null, movementsUsed: 0, ...o });
const office = (id: string, o: Partial<LicenseFields> = {}): Office => ({
  id,
  code: `CODE${id}`,
  name: `مكتب ${id}`,
  phone: null,
  address: null,
  notes: null,
  logoPath: null,
  logoUpdatedAt: null,
  createdAt: at('2026-01-01'),
  updatedAt: at('2026-01-01'),
  ...fields(o),
});

/** مستودع مكاتب وهمي: قائمة قابلة للتبديل بين الاستدعاءات. */
const repoOf = (list: () => Office[]): OfficeRepository => ({
  findByCode: vi.fn(async (code) => list().find((o) => o.code === code) ?? null),
  findById: vi.fn(async (id) => list().find((o) => o.id === id) ?? null),
  list: vi.fn(async () => list()),
  create: vi.fn(),
  update: vi.fn(),
  setCode: vi.fn(),
  licenseSnapshot: vi.fn(async () =>
    list().map(({ id, status, expiresAt, message, movementLimit, movementsUsed }) => ({ id, status, expiresAt, message, movementLimit, movementsUsed })),
  ),
});

describe('effectiveLicenseStatus', () => {
  const now = at('2026-09-20T12:00:00Z');
  it('ACTIVE without expiry stays ACTIVE', () => {
    expect(effectiveLicenseStatus(fields(), now)).toBe('ACTIVE');
  });

  // حد الحركات (قرار المستخدم 2026-09-22): بلوغه يقفل كالإيقاف؛ بلا حد لا أثر؛ رفع الحد يفتح وحده.
  it('LIMIT_REACHED when the additions counter reaches the limit; unlimited (null) never locks', () => {
    expect(effectiveLicenseStatus(fields({ movementLimit: 100, movementsUsed: 99 }), now)).toBe('ACTIVE');
    expect(effectiveLicenseStatus(fields({ movementLimit: 100, movementsUsed: 100 }), now)).toBe('LIMIT_REACHED');
    expect(effectiveLicenseStatus(fields({ movementLimit: 100, movementsUsed: 250 }), now)).toBe('LIMIT_REACHED');
    expect(effectiveLicenseStatus(fields({ movementLimit: null, movementsUsed: 1_000_000 }), now)).toBe('ACTIVE');
    expect(effectiveLicenseStatus(fields({ movementLimit: 300, movementsUsed: 250 }), now)).toBe('ACTIVE');
    // الإيقاف/الانتهاء لهما الأولوية على الحد
    expect(effectiveLicenseStatus(fields({ status: 'SUSPENDED', movementLimit: 1, movementsUsed: 5 }), now)).toBe('SUSPENDED');
  });

  it('licenseErrorFor maps LIMIT_REACHED to 403 LICENSE_LIMIT_REACHED with the counters in details', () => {
    const state = toLicenseState(fields({ movementLimit: 10, movementsUsed: 10 }), now);
    const error = licenseErrorFor(state)!;
    expect(error.code).toBe('LICENSE_LIMIT_REACHED');
    expect(error.status).toBe(403);
    expect(error.details).toMatchObject({ status: 'LIMIT_REACHED', movementLimit: 10, movementsUsed: 10 });
    expect(licenseErrorFor(toLicenseState(fields({ movementLimit: 11, movementsUsed: 10 }), now))).toBeNull();
  });
  it('ACTIVE past its expiry becomes EXPIRED automatically', () => {
    expect(effectiveLicenseStatus(fields({ expiresAt: at('2026-09-20T11:59:59Z') }), now)).toBe('EXPIRED');
    expect(effectiveLicenseStatus(fields({ expiresAt: at('2026-09-21T00:00:00Z') }), now)).toBe('ACTIVE');
  });
  it('SUSPENDED / EXPIRED set by the owner win regardless of the date', () => {
    expect(effectiveLicenseStatus(fields({ status: 'SUSPENDED', expiresAt: at('2030-01-01') }), now)).toBe('SUSPENDED');
    expect(effectiveLicenseStatus(fields({ status: 'EXPIRED' }), now)).toBe('EXPIRED');
  });
  it('toLicenseState carries message/expiry/checkedAt', () => {
    const s = toLicenseState(fields({ status: 'SUSPENDED', message: 'يرجى التواصل مع الدعم' }), now);
    expect(s).toEqual({ status: 'SUSPENDED', expiresAt: null, message: 'يرجى التواصل مع الدعم', movementLimit: null, movementsUsed: 0, checkedAt: now });
  });
});

describe('LicenseMonitor (per office)', () => {
  it('caches reads per office for cacheMs and re-reads afterwards', async () => {
    let t = 1_000_000;
    const repo = repoOf(() => [office('1'), office('2', { status: 'SUSPENDED' })]);
    const monitor = new LicenseMonitor(repo, { now: () => new Date(t) }, undefined, { cacheMs: 5_000, pollMs: 60_000 });
    expect((await monitor.current('1')).status).toBe('ACTIVE');
    expect((await monitor.current('2')).status).toBe('SUSPENDED');
    await monitor.current('1');
    expect(repo.findById).toHaveBeenCalledTimes(2);
    t += 6_000;
    await monitor.current('1');
    expect(repo.findById).toHaveBeenCalledTimes(3);
  });

  it('an unknown office is SUSPENDED with a clear message', async () => {
    const monitor = new LicenseMonitor(repoOf(() => []), { now: () => new Date() }, undefined, { cacheMs: 0, pollMs: 60_000 });
    const state = await monitor.current('404');
    expect(state.status).toBe('SUSPENDED');
    expect(state.message).toBe('المكتب غير موجود');
  });

  it('refresh() notifies subscribers only for offices whose effective state changed', async () => {
    let offices = [office('1'), office('2')];
    const monitor = new LicenseMonitor(repoOf(() => offices), { now: () => new Date() }, undefined, { cacheMs: 0, pollMs: 60_000 });
    const listener = vi.fn();
    monitor.subscribe(listener);
    await monitor.refresh(); // الخط الأساسي بلا تبليغ
    await monitor.refresh();
    expect(listener).not.toHaveBeenCalled();

    offices = [office('1'), office('2', { status: 'SUSPENDED', message: 'موقوف مؤقتاً' })];
    await monitor.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBe('2');
    expect(listener.mock.calls[0][1]).toMatchObject({ status: 'SUSPENDED', message: 'موقوف مؤقتاً' });

    offices = [office('1'), office('2')];
    await monitor.refresh();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1][1]).toMatchObject({ status: 'ACTIVE' });
    // refresh يحدّث الذاكرة أيضاً فلا يحتاج current() قراءة جديدة.
    expect((await monitor.current('2')).status).toBe('ACTIVE');
  });

  it('keeps the last known state when the database read fails (never locks by accident)', async () => {
    let t = 0;
    const repo = repoOf(() => [office('1', { status: 'SUSPENDED' })]);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const monitor = new LicenseMonitor(repo, { now: () => new Date(t) }, logger, { cacheMs: 0, pollMs: 60_000 });
    expect((await monitor.current('1')).status).toBe('SUSPENDED');
    t += 10;
    (repo.findById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'));
    expect((await monitor.current('1')).status).toBe('SUSPENDED');
    expect(logger.warn).toHaveBeenCalled();
    // مكتب لم يُقرأ قط والقاعدة معطّلة ⇒ نشط (لا قفل بالخطأ).
    expect((await monitor.current('9')).status).toBe('ACTIVE');
  });
});

describe('licenseErrorFor', () => {
  const now = new Date();
  it('ACTIVE ⇒ null; SUSPENDED/EXPIRED ⇒ 403 LICENSE_* carrying the state', () => {
    expect(licenseErrorFor(toLicenseState(fields(), now))).toBeNull();
    const suspended = licenseErrorFor(toLicenseState(fields({ status: 'SUSPENDED', message: 'x' }), now))!;
    expect(suspended).toBeInstanceOf(ApplicationError);
    expect(suspended.status).toBe(403);
    expect(suspended.code).toBe('LICENSE_SUSPENDED');
    expect(suspended.details).toMatchObject({ status: 'SUSPENDED', message: 'x' });
    expect(licenseErrorFor(toLicenseState(fields({ status: 'EXPIRED' }), now))?.code).toBe('LICENSE_EXPIRED');
  });
});
