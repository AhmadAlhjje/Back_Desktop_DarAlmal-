/**
 * سياق المستأجر (المكتب) للطلب الحالي: كل استعلام على جدول تجاري يُقيَّد تلقائياً بـ `office_id`
 * السياق (انظر `tenancy-hooks`). يُدخَل عند المصادقة، وصراحةً في عمليات المنصّة والبذر.
 */
export interface TenantScope {
  run<T>(officeId: string, fn: () => Promise<T>): Promise<T>;
  current(): string | null;
}
