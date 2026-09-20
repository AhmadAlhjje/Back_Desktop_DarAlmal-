import type { RequestHandler } from 'express';
import type { TokenService } from '../../../application/ports/services/TokenService.js';
import type { TenantScope } from '../../../application/ports/services/TenantScope.js';
import type { LicenseMonitor } from '../../../application/use-cases/license/LicenseMonitor.js';
import { licenseErrorFor } from '../../../application/use-cases/license/licenseError.js';
import { ApplicationError } from '../../../application/errors/ApplicationError.js';

/**
 * المصادقة + المستأجر + الترخيص في خطوة واحدة: يتحقق من التوكن، يفحص ترخيص مكتبه
 * (موقوف/منتهٍ ⇒ 403 LICENSE_*)، ثم يشغّل بقية الطلب داخل سياق ذلك المكتب فتُقيَّد كل
 * الاستعلامات به تلقائياً.
 */
export const authenticate =
  (tokens: TokenService, license: LicenseMonitor, scope: TenantScope): RequestHandler =>
  (req, _res, next) => {
    const value = req.header('authorization');
    if (!value?.startsWith('Bearer ')) return next(new ApplicationError('UNAUTHENTICATED', 'Authentication required', 401));
    try {
      req.auth = tokens.verify(value.slice(7));
    } catch {
      return next(new ApplicationError('UNAUTHENTICATED', 'Invalid or expired token', 401));
    }
    if (!req.auth.officeId) return next(new ApplicationError('UNAUTHENTICATED', 'Token predates multi-office support', 401));
    license
      .current(req.auth.officeId)
      .then((state) => {
        const error = licenseErrorFor(state);
        if (error) return next(error);
        // `next()` يُستدعى داخل السياق فيرثه كل ما بعده (المسارات والمستودعات).
        return scope.run(req.auth!.officeId, async () => next());
      })
      .catch(next);
  };

export const authorize =
  (permission: string): RequestHandler =>
  (req, _res, next) => {
    if (req.auth?.role === 'ADMIN' || req.auth?.permissions.includes(permission)) return next();
    next(new ApplicationError('FORBIDDEN', 'Insufficient permission', 403));
  };
