import { ApplicationError } from '../../errors/ApplicationError.js';
import { movementLimitReached, type LicenseState } from '../../../domain/entities/License.js';

export const LICENSE_ERROR_CODES = { SUSPENDED: 'LICENSE_SUSPENDED', EXPIRED: 'LICENSE_EXPIRED' } as const;
export const MOVEMENT_LIMIT_CODE = 'LICENSE_LIMIT_REACHED';

const MESSAGES = { SUSPENDED: 'التطبيق موقوف', EXPIRED: 'انتهى الاشتراك' } as const;

/**
 * حد الحركات (2026-09-22): يُرفض **إضافة** حركة فقط عند بلوغه — التطبيق يبقى يعمل، والتعديل/الحذف
 * مسموحان. null إن كان الحد غير مبلوغ أو غير محدّد.
 */
export const movementLimitErrorFor = (state: LicenseState): ApplicationError | null => {
  if (!movementLimitReached(state)) return null;
  return new ApplicationError(MOVEMENT_LIMIT_CODE, 'انتهى عدد الحركات المتاح — لا يمكن إضافة حركة جديدة', 403, {
    movementLimit: state.movementLimit,
    movementsUsed: state.movementsUsed,
    checkedAt: state.checkedAt,
  });
};

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
