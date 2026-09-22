import type { RequestHandler } from 'express';
import type { TokenService } from '../../../application/ports/services/TokenService.js';
import type { TenantScope } from '../../../application/ports/services/TenantScope.js';
import type { AdminRepository } from '../../../application/ports/repositories/AdminRepository.js';
import type { LicenseMonitor } from '../../../application/use-cases/license/LicenseMonitor.js';
import type { SessionPresence } from '../../../application/ports/services/SessionPresence.js';
import { licenseErrorFor, movementLimitErrorFor } from '../../../application/use-cases/license/licenseError.js';
import { ApplicationError } from '../../../application/errors/ApplicationError.js';

/** خطأ الحساب المعطَّل: يقفل التطبيق حتى يعيد المكتب/اللوحة تفعيله. */
export const ADMIN_DEACTIVATED = 'ADMIN_DEACTIVATED';
/** الحساب مفتوح على حاسوب آخر (قرار المستخدم 2026-09-22): جلسة واحدة حيّة لكل حساب. */
export const ACCOUNT_IN_USE = 'ACCOUNT_IN_USE';
export const accountInUseError = () =>
  new ApplicationError(ACCOUNT_IN_USE, 'الحساب مفتوح على حاسوب آخر — لا يمكنك فتحه الآن', 409, { checkedAt: new Date() });

export const adminDeactivatedError = () =>
  new ApplicationError(ADMIN_DEACTIVATED, 'تم تعطيل حسابك من قِبل الإدارة', 403, { checkedAt: new Date() });

/**
 * المصادقة + المستأجر + الترخيص + حالة الحساب في خطوة واحدة: يتحقق من التوكن، يفحص ترخيص
 * مكتبه (موقوف/منتهٍ ⇒ 403 LICENSE_*)، ثم داخل سياق ذلك المكتب يتأكد أن الإداري ما زال
 * **مفعَّلاً** في قاعدة البيانات (معطَّل ⇒ 403 ADMIN_DEACTIVATED حتى لو كان التوكن صالحاً —
 * قرار المستخدم 2026-09-20)، ثم يمرّر الطلب.
 */
export const authenticate =
  (tokens: TokenService, license: LicenseMonitor, scope: TenantScope, admins: AdminRepository, presence?: SessionPresence): RequestHandler =>
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
        return scope.run(req.auth!.officeId, async () => {
          const admin = await admins.findById(req.auth!.adminId);
          if (!admin || !admin.isActive) return next(adminDeactivatedError());
          // جلسة واحدة لكل حساب: جهاز آخر يملك بثّاً حيّاً ⇒ يُرفض كل طلب من هذا الجهاز.
          if (presence?.isActiveElsewhere(req.auth!.adminId, req.auth!.deviceId)) return next(accountInUseError());
          next();
        });
      })
      .catch(next);
  };

/** حد الحركات: على مسارات إضافة الحركات فقط — بلوغ الحد يرفض الإضافة (403) ولا يمسّ بقية التطبيق. */
export const requireMovementQuota =
  (license: LicenseMonitor): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth?.officeId) return next();
    license
      .current(req.auth.officeId)
      .then((state) => next(movementLimitErrorFor(state) ?? undefined))
      .catch(next);
  };

export const authorize =
  (permission: string): RequestHandler =>
  (req, _res, next) => {
    if (req.auth?.role === 'ADMIN' || req.auth?.permissions.includes(permission)) return next();
    next(new ApplicationError('FORBIDDEN', 'Insufficient permission', 403));
  };
