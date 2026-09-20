import type { Model, ModelStatic, Sequelize } from 'sequelize';
import { currentTenant, TenantContextMissingError } from '../../tenancy/TenantContext.js';

/** الجداول التجارية المقيّدة بالمكتب (تحمل `office_id`). الجداول المرجعية (أنواع الحركات) والمكاتب نفسها خارجها. */
export const TENANT_SCOPED_TABLES: ReadonlySet<string> = new Set([
  'admins',
  'client_groups',
  'clients',
  'currencies',
  'movements',
  'journal_entries',
  'notifications',
]);

/** خيار صريح لتجاوز التقييد (عمليات المنصّة التي تعمل على كل المكاتب عمداً). */
export const ALL_OFFICES = 'allOffices';

interface ScopedOptions {
  where?: Record<string | symbol, unknown>;
  [ALL_OFFICES]?: boolean;
}

const tableOf = (model: ModelStatic<Model>): string => {
  const name = model.getTableName();
  return typeof name === 'string' ? name : name.tableName;
};

const isScoped = (model: ModelStatic<Model>): boolean => TENANT_SCOPED_TABLES.has(tableOf(model));

/** يضيف `office_id = <المكتب الحالي>` إلى `where` (أو يرمي إن لم يوجد سياق ولم يُطلب تجاوز). */
function scopeWhere(model: ModelStatic<Model>, options: ScopedOptions): void {
  if (!isScoped(model) || options[ALL_OFFICES]) return;
  const officeId = currentTenant();
  if (!officeId) throw new TenantContextMissingError(tableOf(model));
  const where = (options.where ??= {});
  if (where.office_id === undefined) where.office_id = officeId;
}

/** يثبّت `office_id` على السجل الجديد (أو يرمي إن لم يوجد سياق). */
function stampInstance(instance: Model, options: ScopedOptions): void {
  const model = instance.constructor as ModelStatic<Model>;
  if (!isScoped(model) || options[ALL_OFFICES]) return;
  const current = instance.get('office_id') as unknown;
  if (current !== undefined && current !== null) return;
  const officeId = currentTenant();
  if (!officeId) throw new TenantContextMissingError(tableOf(model));
  instance.set('office_id', officeId);
}

/**
 * شبكة الأمان لتعدد المكاتب (قرار المستخدم 2026-09-20): كل قراءة/عدّ/تحديث/حذف على جدول
 * تجاري تُقيَّد بمكتب الطلب، وكل إدراج يُختم بمعرّفه — تلقائياً ومن مكان واحد، فلا يعتمد
 * العزل على تذكّر كل مستودع. الاستعلامات الخام (`sequelize.query`) خارج هذه الشبكة وتقيّد نفسها
 * صراحةً بـ `requireTenant`.
 */
export function installTenancyHooks(sequelize: Sequelize): void {
  const s = sequelize as unknown as { addHook(name: string, fn: (...args: never[]) => void): void };
  s.addHook('beforeFind', function (this: ModelStatic<Model>, options: ScopedOptions) {
    scopeWhere(this, options);
  });
  s.addHook('beforeCount', function (this: ModelStatic<Model>, options: ScopedOptions) {
    scopeWhere(this, options);
  });
  s.addHook('beforeBulkUpdate', function (this: ModelStatic<Model>, options: ScopedOptions) {
    scopeWhere(this, options);
  });
  s.addHook('beforeBulkDestroy', function (this: ModelStatic<Model>, options: ScopedOptions) {
    scopeWhere(this, options);
  });
  // الختم قبل التحقق: Sequelize يفحص `allowNull` قبل `beforeCreate`، فالختم هناك متأخر.
  s.addHook('beforeValidate', function (this: Model, instance: Model, options: ScopedOptions) {
    if (instance.isNewRecord) stampInstance(instance, options);
  });
  s.addHook('beforeCreate', function (this: Model, instance: Model, options: ScopedOptions) {
    stampInstance(instance, options);
  });
  s.addHook('beforeBulkCreate', function (this: ModelStatic<Model>, instances: Model[], options: ScopedOptions) {
    for (const instance of instances) stampInstance(instance, options);
  });
}
