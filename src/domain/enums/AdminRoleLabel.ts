import { AdminRole } from './AdminRole.js';

/**
 * أسماء الأدوار بالعربية — تُستعمل في نصوص الإشعارات (قرار المستخدم 2026-09-23:
 * «عند اضافة اداري في الاشعارات لا يكتب بدور EMPLOYEE بل تكون بالعربي»).
 * مطابقة لـ `Labels.role` في التطبيق.
 */
const AR_ROLE: Record<AdminRole, string> = {
  [AdminRole.ADMIN]: 'مدير',
  [AdminRole.MANAGER]: 'مشرف',
  [AdminRole.ACCOUNTANT]: 'محاسب',
  [AdminRole.EMPLOYEE]: 'موظف',
  [AdminRole.VIEWER]: 'مشاهد',
};

export function roleLabelAr(role: string): string {
  return AR_ROLE[role as AdminRole] ?? role;
}
