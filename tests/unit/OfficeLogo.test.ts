import { describe, expect, it, vi } from 'vitest';
import { officePublicInfo, type Office } from '../../src/domain/entities/Office.js';
import { ManageOffices } from '../../src/application/use-cases/platform/ManageOffices.js';
import { NotificationHub } from '../../src/infrastructure/realtime/NotificationHub.js';
import { ApplicationError } from '../../src/application/errors/ApplicationError.js';

/**
 * لوغو المكتب من لوحة التحكم (قرار المستخدم 2026-09-21): يُبدَّل من اللوحة متى شاء المالك،
 * ويصل للتطبيق كرابط + نسخة (logoVersion) ليعرف أنه تغيّر — داخل التطبيق يبقى «مرة واحدة».
 */
const office = (o: Partial<Office> = {}): Office => ({
  id: '7',
  code: 'ABCD2345',
  name: 'مكتب حلب',
  status: 'ACTIVE',
  expiresAt: null,
  message: null,
  phone: null,
  address: 'حلب',
  notes: null,
  movementLimit: null,
  movementsUsed: 0,
  logoPath: null,
  logoUpdatedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...o,
});

describe('officePublicInfo', () => {
  it('exposes a root-relative logo url and a version only when a logo exists', () => {
    expect(officePublicInfo(office())).toMatchObject({ id: '7', code: 'ABCD2345', name: 'مكتب حلب', address: 'حلب', logoUrl: null, logoVersion: null });
    const at = new Date('2026-09-21T10:00:00Z');
    expect(officePublicInfo(office({ logoPath: 'uploads/offices/office-7-x.png', logoUpdatedAt: at }))).toMatchObject({
      logoUrl: '/uploads/offices/office-7-x.png',
      logoVersion: at.getTime(),
    });
  });
});

describe('ManageOffices.setLogo', () => {
  const make = (existing: Office | null) => {
    let stored = existing;
    const offices = {
      findById: vi.fn(async () => stored),
      update: vi.fn(async (_id: string, patch: Partial<Office>) => (stored = stored ? { ...stored, ...patch } : null)),
    } as never;
    const manage = new ManageOffices(offices, { statsFor: vi.fn() } as never, {} as never, {} as never, {} as never);
    return { manage, offices };
  };

  it('replaces the logo (any number of times) and reports the previous path so the file can be removed', async () => {
    const { manage } = make(office({ logoPath: 'uploads/offices/old.png', logoUpdatedAt: new Date('2026-01-01') }));
    const first = await manage.setLogo('7', 'uploads/offices/new1.png');
    expect(first.previousPath).toBe('uploads/offices/old.png');
    expect(first.office.logoPath).toBe('uploads/offices/new1.png');
    expect(first.office.logoUpdatedAt!.getTime()).toBeGreaterThan(new Date('2026-01-01').getTime());

    const second = await manage.setLogo('7', 'uploads/offices/new2.png');
    expect(second.previousPath).toBe('uploads/offices/new1.png');
    expect(second.office.logoPath).toBe('uploads/offices/new2.png');
  });

  it('clears the logo (null path + null version)', async () => {
    const { manage } = make(office({ logoPath: 'uploads/offices/old.png', logoUpdatedAt: new Date() }));
    const r = await manage.setLogo('7', null);
    expect(r.previousPath).toBe('uploads/offices/old.png');
    expect(r.office.logoPath).toBeNull();
    expect(r.office.logoUpdatedAt).toBeNull();
    expect(officePublicInfo(r.office).logoVersion).toBeNull();
  });

  it('404s for an unknown office', async () => {
    const { manage } = make(null);
    await expect(manage.setLogo('9', 'x.png')).rejects.toMatchObject({ code: 'OFFICE_NOT_FOUND' } satisfies Partial<ApplicationError>);
  });
});

describe('NotificationHub office channel', () => {
  it('delivers office info only to that office and stops after unsubscribe', () => {
    const hub = new NotificationHub();
    const mine = vi.fn();
    const other = vi.fn();
    const off = hub.subscribeOffice('7', mine);
    hub.subscribeOffice('8', other);
    const info = officePublicInfo(office({ logoPath: 'uploads/offices/a.png', logoUpdatedAt: new Date() }));
    hub.publishOffice(info);
    expect(mine).toHaveBeenCalledWith(info);
    expect(other).not.toHaveBeenCalled();
    off();
    hub.publishOffice(info);
    expect(mine).toHaveBeenCalledTimes(1);
  });
});
