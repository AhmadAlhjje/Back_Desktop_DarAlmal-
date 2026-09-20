import { z } from 'zod';
/** تسجيل الدخول: كود المكتب (يُطبَّع: أحرف كبيرة بلا مسافات) + اسم المستخدم + كلمة المرور. */
export const loginSchema = z
  .object({
    officeCode: z.string().trim().min(4).max(16),
    fullName: z.string().min(1).max(150),
    password: z.string().min(8).max(200),
  })
  .strict();
/** تغيير كلمة مرور الحساب الحالي: الحالية + الجديدة (8 محارف فأكثر). */
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(8).max(200) })
  .strict();
