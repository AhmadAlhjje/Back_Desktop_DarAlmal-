import { describe, expect, it, vi } from 'vitest';
import { Sequelize, DataTypes } from 'sequelize';
import { installTenancyHooks, ALL_OFFICES } from '../../src/infrastructure/database/sequelize/tenancy-hooks.js';
import { currentTenant, runWithTenant, requireTenant, TenantContextMissingError } from '../../src/infrastructure/tenancy/TenantContext.js';
import { Login } from '../../src/application/use-cases/auth/Login.js';
import { LicenseMonitor } from '../../src/application/use-cases/license/LicenseMonitor.js';
import { ManageOffices, generateOfficeCode } from '../../src/application/use-cases/platform/ManageOffices.js';
import { platformAuth } from '../../src/presentation/http/platformRoutes.js';
import { OFFICE_CODE_PATTERN, normalizeOfficeCode } from '../../src/domain/entities/Office.js';
import { ApplicationError } from '../../src/application/errors/ApplicationError.js';
import type { Office } from '../../src/domain/entities/Office.js';

/**
 * عزل المكاتب: الخطّافات العامة تقيّد كل قراءة/تحديث/حذف بمكتب السياق وتختم كل إدراج،
 * وترمي خارج أي سياق — مثبت هنا على Sequelize بلا اتصال (نلتقط الخيارات قبل تنفيذ الاستعلام).
 */
function fakeSequelize() {
  const sequelize = new Sequelize('mysql://user:pass@localhost:1/db', { logging: false });
  const Client = sequelize.define('clients', { office_id: DataTypes.BIGINT, full_name: DataTypes.STRING }, { tableName: 'clients', timestamps: false });
  const MovementType = sequelize.define('movement_types', { movement_code: DataTypes.STRING }, { tableName: 'movement_types', timestamps: false });
  installTenancyHooks(sequelize);
  return { sequelize, Client, MovementType };
}

/** يشغّل خطّاف قراءة على النموذج ويعيد الخيارات بعد التقييد. */
async function runFind(model: { runHooks: (name: string, opts: unknown) => Promise<void> }, options: Record<string, unknown>) {
  await model.runHooks('beforeFind', options);
  return options;
}

describe('tenancy hooks', () => {
  const { Client, MovementType } = fakeSequelize();
  const hooks = (m: unknown) => m as { runHooks: (name: string, ...args: unknown[]) => Promise<void> };

  it('adds office_id to where inside a tenant context', async () => {
    await runWithTenant('7', async () => {
      const options = await runFind(hooks(Client), { where: { full_name: 'x' } });
      expect(options.where).toEqual({ full_name: 'x', office_id: '7' });
      const empty = await runFind(hooks(Client), {});
      expect(empty.where).toEqual({ office_id: '7' });
    });
  });

  it('never touches unscoped (reference) tables', async () => {
    const options = await runFind(hooks(MovementType), { where: { movement_code: 'TRANSFER' } });
    expect(options.where).toEqual({ movement_code: 'TRANSFER' });
  });

  it('throws outside a tenant context for scoped tables (protects against leaks)', async () => {
    await expect(runFind(hooks(Client), {})).rejects.toBeInstanceOf(TenantContextMissingError);
    expect(() => requireTenant('movements')).toThrow(TenantContextMissingError);
  });

  it('allows an explicit all-offices read for the platform', async () => {
    const options = await runFind(hooks(Client), { [ALL_OFFICES]: true, where: {} });
    expect(options.where).toEqual({});
  });

  it('stamps office_id on new rows and scopes bulk update/destroy/count', async () => {
    await runWithTenant('3', async () => {
      const instance = Client.build({ full_name: 'a' });
      // التحقق يسبق beforeCreate في Sequelize ⇒ الختم يجب أن يكون جاهزاً عند beforeValidate.
      await hooks(Client).runHooks('beforeValidate', instance, {});
      expect(instance.get('office_id')).toBe('3');
      const viaCreate = Client.build({ full_name: 'c' });
      await hooks(Client).runHooks('beforeCreate', viaCreate, {});
      expect(viaCreate.get('office_id')).toBe('3');
      // create() الحقيقي (بلا اتصال): يجب أن يجتاز التحقق ويصل إلى الاستعلام لا إلى notNull Violation.
      await expect(Client.create({ full_name: 'd' })).rejects.not.toThrow(/notNull/);
      const bulk = [Client.build({ full_name: 'b' })];
      await hooks(Client).runHooks('beforeBulkCreate', bulk, {});
      expect(bulk[0].get('office_id')).toBe('3');
      const upd: Record<string, unknown> = { where: { id_client: 1 } };
      await hooks(Client).runHooks('beforeBulkUpdate', upd);
      expect(upd.where).toEqual({ id_client: 1, office_id: '3' });
      const del: Record<string, unknown> = { where: {} };
      await hooks(Client).runHooks('beforeBulkDestroy', del);
      expect(del.where).toEqual({ office_id: '3' });
      const cnt: Record<string, unknown> = {};
      await hooks(Client).runHooks('beforeCount', cnt);
      expect(cnt.where).toEqual({ office_id: '3' });
    });
  });

  it('async continuations inherit the tenant; nested runs are isolated', async () => {
    await runWithTenant('1', async () => {
      await new Promise((r) => setTimeout(r, 1));
      expect(currentTenant()).toBe('1');
      await runWithTenant('2', async () => expect(currentTenant()).toBe('2'));
      expect(currentTenant()).toBe('1');
    });
    expect(currentTenant()).toBeNull();
  });
});

const office = (o: Partial<Office> = {}): Office => ({
  id: '5',
  code: 'ABCD2345',
  name: 'مكتب حلب',
  status: 'ACTIVE',
  expiresAt: null,
  message: null,
  phone: null,
  address: null,
  notes: null,
  movementLimit: null,
  movementsUsed: 0,
  logoPath: null,
  logoUpdatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...o,
});
const scope = { run: <T>(_id: string, fn: () => Promise<T>) => fn(), current: () => null };

describe('Login: one-time office code → device key (2026-09-22)', () => {
  const admin = { id: '9', fullName: 'مدير', passwordHash: 'h', role: 'ADMIN', permissions: ['x'], isActive: true, phone: null, email: null, isDeveloper: false };
  const make = (found: Office | null, deviceFound: { id: string; officeId: string } | null = null) => {
    let current = found;
    const offices = {
      findByCode: vi.fn(async (code: string) => (current && current.code === code ? current : null)),
      findById: vi.fn(async (id: string) => (current && current.id === id ? current : null)),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setCode: vi.fn(async (_id: string, code: string) => (current = current ? { ...current, code } : null)),
      licenseSnapshot: vi.fn().mockResolvedValue([]),
    };
    const devices = {
      create: vi.fn(async (input: { keyHash: string }) => ({ id: '1', keyHash: input.keyHash })),
      findActiveByKeyHash: vi.fn().mockResolvedValue(deviceFound),
      listByOffice: vi.fn(),
      revoke: vi.fn(),
      touch: vi.fn().mockResolvedValue(undefined),
    };
    const admins = { findByFullName: vi.fn().mockResolvedValue(admin) };
    const hasher = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(true) };
    const tokens = { sign: vi.fn().mockReturnValue('tok'), verify: vi.fn() };
    const monitor = new LicenseMonitor(offices, { now: () => new Date() }, undefined, { cacheMs: 0, pollMs: 60_000 });
    const login = new Login(offices, admins as never, hasher, tokens, monitor, scope, devices as never, () => 'NEWC0DE9', () => 'k'.repeat(64));
    return { login, offices, tokens, devices };
  };

  it('first login with the code: issues a device key, records the device, and rotates the office code', async () => {
    const { login, offices, tokens, devices } = make(office());
    const result = await login.execute({ officeCode: ' abcd-2345 ', fullName: 'مدير', password: 'password1' });
    expect(offices.findByCode).toHaveBeenCalledWith('ABCD2345');
    expect(result.deviceKey).toBe('k'.repeat(64));
    expect(devices.create).toHaveBeenCalledWith(expect.objectContaining({ officeId: '5', enrolledBy: '9' }));
    expect((devices.create.mock.calls[0][0] as { keyHash: string }).keyHash).not.toBe('k'.repeat(64));
    expect(offices.setCode).toHaveBeenCalledWith('5', 'NEWC0DE9');
    expect(tokens.sign).toHaveBeenCalledWith(expect.objectContaining({ adminId: '9', officeId: '5', officeCode: 'NEWC0DE9' }));
    expect(result.office).toMatchObject({ id: '5', code: 'NEWC0DE9', name: 'مكتب حلب' });
    // الكود القديم استُهلك
    await expect(login.execute({ officeCode: 'ABCD2345', fullName: 'مدير', password: 'password1' })).rejects.toMatchObject({ code: 'OFFICE_NOT_FOUND' });
  });

  it('later logins use the device key only: no code, no rotation, no new device', async () => {
    const { login, offices, devices } = make(office(), { id: '1', officeId: '5' });
    const result = await login.execute({ deviceKey: 'k'.repeat(64), fullName: 'مدير', password: 'password1' });
    expect(result.deviceKey).toBeUndefined();
    expect(devices.create).not.toHaveBeenCalled();
    expect(offices.setCode).not.toHaveBeenCalled();
    expect(result.office).toMatchObject({ id: '5', code: 'ABCD2345' });
  });

  it('an unknown or revoked device key → DEVICE_NOT_FOUND (the app then asks for a code)', async () => {
    const { login } = make(office(), null);
    await expect(login.execute({ deviceKey: 'x'.repeat(64), fullName: 'مدير', password: 'password1' })).rejects.toMatchObject({ code: 'DEVICE_NOT_FOUND', status: 404 });
  });

  it('rejects an unknown office code with OFFICE_NOT_FOUND before touching credentials', async () => {
    const { login } = make(null);
    await expect(login.execute({ officeCode: 'ZZZZ9999', fullName: 'مدير', password: 'password1' })).rejects.toMatchObject({ code: 'OFFICE_NOT_FOUND', status: 404 });
  });

  it('rejects login for a suspended office with 403 LICENSE_SUSPENDED (code is NOT consumed)', async () => {
    const { login, offices } = make(office({ status: 'SUSPENDED', message: 'لم يُسدَّد' }));
    await expect(login.execute({ officeCode: 'ABCD2345', fullName: 'مدير', password: 'password1' })).rejects.toMatchObject({
      code: 'LICENSE_SUSPENDED',
      status: 403,
      details: expect.objectContaining({ message: 'لم يُسدَّد' }),
    });
    expect(offices.setCode).not.toHaveBeenCalled();
  });

  it('a wrong password does not consume the code either', async () => {
    const { login, offices, devices } = make(office());
    (devices as unknown as { create: ReturnType<typeof vi.fn> }).create.mockClear();
    const hasherFail = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(false) };
    const monitor = new LicenseMonitor(offices, { now: () => new Date() }, undefined, { cacheMs: 0, pollMs: 60_000 });
    const l = new Login(offices, { findByFullName: vi.fn().mockResolvedValue(admin) } as never, hasherFail, { sign: vi.fn(), verify: vi.fn() }, monitor, scope, devices as never);
    await expect(l.execute({ officeCode: 'ABCD2345', fullName: 'مدير', password: 'wrong-pass' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(offices.setCode).not.toHaveBeenCalled();
    expect(devices.create).not.toHaveBeenCalled();
    void login;
  });
});

describe('ManageOffices', () => {
  it('generates 8-char codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i += 1) expect(generateOfficeCode()).toMatch(OFFICE_CODE_PATTERN);
    expect(generateOfficeCode(() => new Uint8Array(8))).toBe('AAAAAAAA');
    expect(normalizeOfficeCode(' ab cd-2345 ')).toBe('ABCD2345');
  });

  it('creates the office then seeds currencies, system accounts and the first admin inside its tenant scope', async () => {
    const created: string[] = [];
    let tenantDuringSeed: string | null = null;
    const repos = {
      officeRepository: { create: vi.fn(async (input: Office) => ({ ...office(), ...input, id: '42' })) },
      currencyRepository: { create: vi.fn(async (c: { code: string }) => created.push(`currency:${c.code}`)) },
      clientRepository: { createSystemAccount: vi.fn(async (a: { code: string }) => created.push(`client:${a.code}`)) },
      adminRepository: { create: vi.fn(async (a: { fullName: string; passwordHash: string }) => created.push(`admin:${a.fullName}:${a.passwordHash}`)) },
    };
    const uow = { execute: (work: (r: unknown) => Promise<unknown>) => work(repos) };
    const scopeSpy = {
      run: async <T>(id: string, fn: () => Promise<T>) => {
        tenantDuringSeed = id;
        return fn();
      },
      current: () => null,
    };
    const offices = { findByCode: vi.fn().mockResolvedValue(null), findById: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), setCode: vi.fn(), licenseSnapshot: vi.fn() };
    const hasher = { hash: vi.fn().mockResolvedValue('HASH'), compare: vi.fn() };
    const stats = { statsFor: vi.fn().mockResolvedValue([]), overview: vi.fn() };
    const manage = new ManageOffices(offices, stats, uow as never, scopeSpy, hasher, () => 'ABCD2345');

    const result = await manage.create({ name: ' مكتب حلب ', admin: { fullName: 'أحمد', password: 'secret123' } });
    expect(result.code).toBe('ABCD2345');
    expect(repos.officeRepository.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'ABCD2345', name: 'مكتب حلب', status: 'ACTIVE' }));
    expect(tenantDuringSeed).toBe('42');
    expect(created).toEqual([
      'currency:USD',
      'currency:SYP',
      'currency:EUR',
      'currency:TRY',
      'client:SYS-CASH',
      'client:SYS-PNL',
      'admin:أحمد:HASH',
    ]);
  });

  it('retries on a code collision and fails loudly after 10 attempts', async () => {
    const offices = { findByCode: vi.fn().mockResolvedValue(office()), findById: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), setCode: vi.fn(), licenseSnapshot: vi.fn() };
    const manage = new ManageOffices(offices, { statsFor: vi.fn(), overview: vi.fn() }, { execute: vi.fn() } as never, scope, { hash: vi.fn().mockResolvedValue('h'), compare: vi.fn() }, () => 'ABCD2345');
    await expect(manage.create({ name: 'x', admin: { fullName: 'a', password: 'secret123' } })).rejects.toMatchObject({ code: 'OFFICE_CODE_GENERATION_FAILED' });
    expect(offices.findByCode).toHaveBeenCalledTimes(10);
  });

  it('regenerateCode replaces the code with a fresh unique one (old sessions keep working by office id)', async () => {
    const existing = office();
    const offices = {
      findByCode: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(existing),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setCode: vi.fn(async (_id: string, code: string) => ({ ...existing, code })),
      licenseSnapshot: vi.fn(),
    };
    const manage = new ManageOffices(offices, { statsFor: vi.fn(), overview: vi.fn() }, { execute: vi.fn() } as never, scope, { hash: vi.fn(), compare: vi.fn() }, () => 'NEWC0DE7'.replace('0', 'Q'));
    const updated = await manage.regenerateCode('5');
    expect(updated.code).toBe('NEWCQDE7');
    expect(offices.setCode).toHaveBeenCalledWith('5', 'NEWCQDE7');
    offices.findById.mockResolvedValueOnce(null);
    await expect(manage.regenerateCode('404')).rejects.toMatchObject({ code: 'OFFICE_NOT_FOUND' });
  });

  it('setLicense updates status/expiry/message and 404s for unknown offices', async () => {
    const offices = { findByCode: vi.fn(), findById: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn().mockResolvedValue(null), setCode: vi.fn(), licenseSnapshot: vi.fn() };
    const manage = new ManageOffices(offices, { statsFor: vi.fn(), overview: vi.fn() }, { execute: vi.fn() } as never, scope, { hash: vi.fn(), compare: vi.fn() });
    await expect(manage.setLicense('1', { status: 'SUSPENDED', message: 'x' })).rejects.toBeInstanceOf(ApplicationError);
    expect(offices.update).toHaveBeenCalledWith('1', { status: 'SUSPENDED', expiresAt: null, message: 'x' });
  });
});

describe('platformAuth', () => {
  const run = (key: string) =>
    new Promise<unknown>((resolve) => {
      platformAuth('k'.repeat(32))({ header: () => key } as never, {} as never, (err?: unknown) => resolve(err));
    });
  it('accepts the exact key and rejects anything else', async () => {
    expect(await run('k'.repeat(32))).toBeUndefined();
    expect(await run('k'.repeat(31))).toMatchObject({ code: 'PLATFORM_UNAUTHORIZED', status: 401 });
    expect(await run('')).toMatchObject({ code: 'PLATFORM_UNAUTHORIZED' });
  });
});
