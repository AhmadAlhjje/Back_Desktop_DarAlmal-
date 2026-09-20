import { ApplicationError } from '../../errors/ApplicationError.js';
import type { LicenseState } from '../../../domain/entities/License.js';

export const LICENSE_ERROR_CODES = { SUSPENDED: 'LICENSE_SUSPENDED', EXPIRED: 'LICENSE_EXPIRED' } as const;

/** خطأ 403 يحمل الحالة كاملة في `details` حتى تعرضها شاشة القفل مباشرة؛ null إن كان الترخيص نشطاً. */
export const licenseErrorFor = (state: LicenseState): ApplicationError | null => {
  if (state.status === 'ACTIVE') return null;
  return new ApplicationError(
    LICENSE_ERROR_CODES[state.status],
    state.status === 'SUSPENDED' ? 'التطبيق موقوف' : 'انتهى الاشتراك',
    403,
    { status: state.status, expiresAt: state.expiresAt, message: state.message, checkedAt: state.checkedAt },
  );
};
