/**
 * إعلان المنصّة (قرار المستخدم 2026-09-23): رسالة يكتبها المالك في لوحة التحكم ويفعّلها،
 * فتُعرض على **كل** التطبيقات ويتوقّف التطبيق عن العمل حتى يُلغيها من اللوحة.
 *
 * التوقيت مقصود: تُفحص عند **إقلاع التطبيق وعند تسجيل الدخول فقط** — من كان داخل التطبيق
 * يُكمل عمله ولا تظهر له حتى يخرج ويعود (لذلك لا تمرّ عبر قناة الترخيص ولا تُفحص في
 * `authenticate`).
 */
export interface PlatformNotice {
  isActive: boolean;
  title: string | null;
  message: string;
  updatedAt: Date | null;
}

export interface PlatformNoticeInput {
  isActive: boolean;
  title?: string | null;
  message: string;
}

/** لا إعلان — الحالة الطبيعية. */
export const NO_NOTICE: PlatformNotice = { isActive: false, title: null, message: '', updatedAt: null };

/** إعلان فعّال فعلاً: مفعَّل ونصّه غير فارغ (إعلان بلا نصّ لا يُوقف أحداً). */
export const noticeBlocks = (notice: PlatformNotice | null | undefined): boolean =>
  Boolean(notice?.isActive && notice.message.trim().length > 0);
