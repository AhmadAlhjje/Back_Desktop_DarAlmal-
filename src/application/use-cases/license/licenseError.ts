import { ApplicationError } from '../../errors/ApplicationError.js';
import type { LicenseState } from '../../../domain/entities/License.js';

export const LICENSE_ERROR_CODES = {
  SUSPENDED: 'LICENSE_SUSPENDED',
  EXPIRED: 'LICENSE_EXPIRED',
  LIMIT_REACHED: 'LICENSE_LIMIT_REACHED',
} as const;

const MESSAGES = { SUSPENDED: 'التطبيق موقوف', EXPIRED: 'انتهى الاشتراك', LIMIT_REACHED: 'انتهى عدد الحركات المتاح' } as const;

/** خطأ 403 يحمل الحالة كاملة في `details` حتى تعرضها شاشة القفل مباشرة؛ null إن كان الترخيص نشطاً. */
export const licenseErrorFor = (state: LicenseState): ApplicationError | null => {
  if (state.status === 'ACTIVE') return null;
  return new ApplicationError(LICENSE_ERROR_CODES[state.status], MESSAGES[state.status], 403, {
    status: state.status,
    expiresAt: state.expiresAt,
    message: state.message,
    movementLimit: state.movementLimit,
    movementsUsed: state.movementsUsed,
    checkedAt: state.checkedAt,
  });
};
