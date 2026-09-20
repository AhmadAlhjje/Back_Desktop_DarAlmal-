import { AsyncLocalStorage } from 'node:async_hooks';
import type { TenantScope } from '../../application/ports/services/TenantScope.js';

interface TenantStore {
  officeId: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

/** يشغّل `fn` داخل سياق المكتب؛ كل الاستمرارات غير المتزامنة داخله ترث السياق. */
export function runWithTenant<T>(officeId: string, fn: () => Promise<T>): Promise<T> {
  return storage.run({ officeId }, fn);
}

/** معرّف مكتب الطلب الحالي أو null خارج أي سياق. */
export function currentTenant(): string | null {
  return storage.getStore()?.officeId ?? null;
}

export class TenantContextMissingError extends Error {
  constructor(public readonly table: string) {
    super(`Tenant context missing for table "${table}"`);
    this.name = 'TenantContextMissingError';
  }
}

/** معرّف المكتب الحالي أو خطأ — للمواضع التي لا يجوز أن تعمل بلا مكتب (الاستعلامات الخام). */
export function requireTenant(table: string): string {
  const id = currentTenant();
  if (!id) throw new TenantContextMissingError(table);
  return id;
}

export const tenantScope: TenantScope = { run: runWithTenant, current: currentTenant };
