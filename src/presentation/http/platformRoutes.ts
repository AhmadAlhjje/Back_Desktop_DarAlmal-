import { Router, type RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ApplicationError } from '../../application/errors/ApplicationError.js';
import type { LicenseMonitor } from '../../application/use-cases/license/LicenseMonitor.js';
import type { NotificationHub } from '../../infrastructure/realtime/NotificationHub.js';
import type { ManageOfficeAdmins } from '../../application/use-cases/platform/ManageOfficeAdmins.js';
import type { ManageOffices } from '../../application/use-cases/platform/ManageOffices.js';
import type { PlatformStatsRepository } from '../../application/ports/repositories/PlatformStatsRepository.js';
import { LICENSE_STATUSES } from '../../domain/entities/License.js';
import { AdminRole } from '../../domain/enums/AdminRole.js';
import { validate } from './middleware/validate.js';
import { officeLogoDirectory, uploadOfficeLogo } from './middleware/officeLogoUpload.js';
import { officePublicInfo } from '../../domain/entities/Office.js';
import { rm } from 'node:fs/promises';
import path from 'node:path';

const asyncRoute =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

/** مفتاح المنصّة (لوحة التحكم ↔ الواجهة البرمجية): مقارنة ثابتة الزمن. */
export const platformAuth =
  (apiKey: string): RequestHandler =>
  (req, _res, next) => {
    const provided = req.header('x-platform-key') ?? '';
    const a = Buffer.from(provided);
    const b = Buffer.from(apiKey);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      return next(new ApplicationError('PLATFORM_UNAUTHORIZED', 'Invalid platform key', 401));
    next();
  };

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const dateOrNull = z
  .union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .transform((v) => (v ? new Date(v) : v === null ? null : undefined));

export const createOfficeSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: nullableText(30),
  address: nullableText(255),
  notes: nullableText(2000),
  expiresAt: dateOrNull,
  message: nullableText(500),
  admin: z.object({
    fullName: z.string().trim().min(2).max(150),
    password: z.string().min(8).max(128),
    phone: nullableText(30),
    email: z.string().trim().email().max(150).nullable().optional(),
  }),
});
export const updateOfficeSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  phone: nullableText(30),
  address: nullableText(255),
  notes: nullableText(2000),
});
export const setLicenseSchema = z.object({
  status: z.enum(LICENSE_STATUSES as [string, ...string[]]),
  expiresAt: dateOrNull,
  message: nullableText(500),
});
export const createOfficeAdminSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  password: z.string().min(8).max(128),
  phone: nullableText(30),
  email: z.string().trim().email().max(150).nullable().optional(),
  role: z.nativeEnum(AdminRole).optional(),
});
export const resetPasswordSchema = z.object({ password: z.string().min(8).max(128) });

/**
 * مسارات المنصّة `/platform/*` — تستهلكها لوحة التحكم فقط (مفتاح `X-Platform-Key`)، وتعمل عبر
 * كل المكاتب عمداً: إنشاء المكاتب وتوليد أكوادها، الترخيص، الإداريون، والإحصاءات.
 */
export function createPlatformRoutes(deps: {
  platformApiKey: string;
  manageOffices: ManageOffices;
  manageOfficeAdmins: ManageOfficeAdmins;
  platformStats: PlatformStatsRepository;
  licenseMonitor: LicenseMonitor;
  notificationHub: NotificationHub;
}) {
  const router = Router();
  router.use(platformAuth(deps.platformApiKey));

  router.get(
    '/overview',
    asyncRoute(async (_req, res) => {
      res.json({ success: true, data: await deps.platformStats.overview() });
    }),
  );

  router.get(
    '/offices',
    asyncRoute(async (_req, res) => {
      res.json({ success: true, data: await deps.manageOffices.list() });
    }),
  );
  router.post(
    '/offices',
    validate(createOfficeSchema),
    asyncRoute(async (req, res) => {
      const office = await deps.manageOffices.create(req.body);
      res.status(201).json({ success: true, data: office });
    }),
  );
  router.get(
    '/offices/:id',
    asyncRoute(async (req, res) => {
      const office = await deps.manageOffices.get(req.params.id);
      res.json({ success: true, data: { ...office, license: await deps.licenseMonitor.current(office.id) } });
    }),
  );
  router.patch(
    '/offices/:id',
    validate(updateOfficeSchema),
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageOffices.update(req.params.id, req.body) });
    }),
  );
  router.put(
    '/offices/:id/license',
    validate(setLicenseSchema),
    asyncRoute(async (req, res) => {
      const office = await deps.manageOffices.setLicense(req.params.id, req.body);
      // تبليغ فوري (بلا انتظار الاستطلاع) لأجهزة المكتب المتصلة.
      await deps.licenseMonitor.refresh();
      res.json({ success: true, data: office });
    }),
  );

  // لوغو المكتب: يُبدَّل من اللوحة متى شاء المالك ويصل للتطبيق فوراً (SSE `office`) — قرار المستخدم 2026-09-21.
  const removeLogoFile = async (logoPath: string | null) => {
    if (!logoPath) return;
    const abs = path.resolve(process.cwd(), logoPath);
    if (!abs.startsWith(officeLogoDirectory)) return; // لا نحذف إلا داخل مجلد اللوغوهات
    await rm(abs, { force: true }).catch(() => undefined);
  };
  router.put(
    '/offices/:id/logo',
    (req, res, next) => uploadOfficeLogo(req, res, (err?: unknown) => (err ? next(err) : next())),
    asyncRoute(async (req, res) => {
      if (!req.file) throw new ApplicationError('VALIDATION_ERROR', 'logo file is required', 422);
      const logoPath = `uploads/offices/${req.file.filename}`;
      let result;
      try {
        result = await deps.manageOffices.setLogo(req.params.id, logoPath);
      } catch (error) {
        await removeLogoFile(logoPath);
        throw error;
      }
      await removeLogoFile(result.previousPath);
      deps.notificationHub.publishOffice(officePublicInfo(result.office));
      res.json({ success: true, data: result.office });
    }),
  );
  router.delete(
    '/offices/:id/logo',
    asyncRoute(async (req, res) => {
      const result = await deps.manageOffices.setLogo(req.params.id, null);
      await removeLogoFile(result.previousPath);
      deps.notificationHub.publishOffice(officePublicInfo(result.office));
      res.json({ success: true, data: result.office });
    }),
  );

  router.post(
    '/offices/:id/code',
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageOffices.regenerateCode(req.params.id) });
    }),
  );

  router.get(
    '/offices/:id/admins',
    asyncRoute(async (req, res) => {
      res.json({ success: true, data: await deps.manageOfficeAdmins.list(req.params.id) });
    }),
  );
  router.post(
    '/offices/:id/admins',
    validate(createOfficeAdminSchema),
    asyncRoute(async (req, res) => {
      res.status(201).json({ success: true, data: await deps.manageOfficeAdmins.create(req.params.id, req.body) });
    }),
  );
  router.put(
    '/offices/:id/admins/:adminId/password',
    validate(resetPasswordSchema),
    asyncRoute(async (req, res) => {
      res.json({
        success: true,
        data: await deps.manageOfficeAdmins.resetPassword(req.params.id, req.params.adminId, req.body.password),
      });
    }),
  );
  router.patch(
    '/offices/:id/admins/:adminId/deactivate',
    asyncRoute(async (req, res) => {
      const admin = await deps.manageOfficeAdmins.setActive(req.params.id, req.params.adminId, false);
      deps.notificationHub.publishAccount(admin.id, { isActive: false });
      res.json({ success: true, data: admin });
    }),
  );
  router.patch(
    '/offices/:id/admins/:adminId/activate',
    asyncRoute(async (req, res) => {
      const admin = await deps.manageOfficeAdmins.setActive(req.params.id, req.params.adminId, true);
      deps.notificationHub.publishAccount(admin.id, { isActive: true });
      res.json({ success: true, data: admin });
    }),
  );
  return router;
}
