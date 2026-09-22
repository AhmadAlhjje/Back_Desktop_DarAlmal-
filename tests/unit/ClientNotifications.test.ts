import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * إشعار لكل إجراء على حساب (قرار المستخدم 2026-09-22): إنشاء، تعديل، أرشفة/إلغاء، تعيين صندوق،
 * سرّية، تدوير، حذف — كلها تُنشئ إشعاراً للإداريين. هذا الاختبار يحرس ألا يُضاف مسار تعديل
 * لحساب بلا إشعار (كان الحذف وتبديل السرّية بلا إشعار).
 */
const source = readFileSync(new URL('../../src/presentation/http/routes.ts', import.meta.url), 'utf8');

/** جسم المسار: من سطر تعريفه حتى إغلاقه `  );`. */
function handlerOf(method: string, path: string): string {
  const head = `  router.${method}(\n    '${path}',`;
  const start = source.indexOf(head);
  expect(start, `route ${method} ${path} not found`).toBeGreaterThan(-1);
  const end = source.indexOf('\n  );', start);
  return source.slice(start, end);
}

describe('every client mutation notifies the admins', () => {
  const routes: Array<[string, string]> = [
    ['post', '/clients'],
    ['patch', '/clients/:id'],
    ['patch', '/clients/:id/archive'],
    ['patch', '/clients/:id/set-cash-box'],
    ['patch', '/clients/:id/set-secret'],
    ['patch', '/clients/:id/rollover'],
    ['delete', '/clients/:id'],
  ];

  it.each(routes)('%s %s sends a CLIENT notification', (method, path) => {
    const body = handlerOf(method, path);
    expect(body).toContain('notifyAs(');
    expect(body).toContain("type: 'CLIENT'");
  });

  // بلاغ المستخدم 2026-09-23: «كود العميل CL-... لا أريده أن يظهر في الإشعارات».
  it.each(routes)('%s %s never puts the account code in the message', (method, path) => {
    expect(handlerOf(method, path)).not.toContain('client.code');
  });

  // بلاغ المستخدم 2026-09-23: «بدور EMPLOYEE» ⇒ اسم الدور بالعربية.
  it('the new-admin notification names the role in Arabic, not the raw enum', () => {
    const body = handlerOf('post', '/admins');
    expect(body).toContain('roleLabelAr(admin.role)');
    expect(body).not.toContain('${admin.role}');
    const labels = readFileSync(new URL('../../src/domain/enums/AdminRoleLabel.ts', import.meta.url), 'utf8');
    for (const arabic of ['مدير', 'مشرف', 'محاسب', 'موظف', 'مشاهد']) expect(labels).toContain(arabic);
  });

  it('the delete notification can name the account (fullName comes back from the use case)', () => {
    const useCase = readFileSync(new URL('../../src/application/use-cases/clients/ManageClients.ts', import.meta.url), 'utf8');
    expect(useCase).toContain('fullName: client.fullName');
    expect(handlerOf('delete', '/clients/:id')).toContain('result.fullName');
  });
});
