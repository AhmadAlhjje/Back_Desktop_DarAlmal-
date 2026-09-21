import { z } from 'zod';
/**
 * تسجيل الدخول: (كود المكتب — أول مرة على الجهاز، يُستهلك) أو (مفتاح الجهاز — لاحقاً) + اسم المستخدم + كلمة المرور.
 */
export const loginSchema = z
  .object({
    officeCode: z.string().trim().min(4).max(16).optional(),
    deviceKey: z.string().trim().min(32).max(128).optional(),
    fullName: z.string().min(1).max(150),
    password: z.string().min(8).max(200),
  })
  .strict()
  .refine((v) => Boolean(v.officeCode || v.deviceKey), { message: 'officeCode or deviceKey is required', path: ['officeCode'] });
/** تغيير كلمة مرور الحساب الحالي: الحالية + الجديدة (8 محارف فأكثر). */
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(8).max(200) })
  .strict();
