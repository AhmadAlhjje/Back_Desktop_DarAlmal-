'use strict';

/**
 * أنواع الحركات (TRANSFER/SETTLEMENT/…) بيانات مرجعية نظامية لا عيّنات: كانت تُبذر فقط عبر
 * seeder البيانات الرئيسية، فتثبيتٌ جديد يشغّل الهجرات وحدها (Docker على الخادم) كان يترك الجدول
 * فارغاً ويفشل إنشاء أي حركة بـ MOVEMENT_TYPE_NOT_FOUND («نوع الحركة غير مفعّل» في التطبيق —
 * 2026-09-21). هنا تُضاف الأنواع الناقصة فقط (آمنة على القواعد المبذورة سابقاً).
 */
const TYPES = [
  ['TRANSFER', 'حركة حوالة'],
  ['SETTLEMENT', 'حركة تسوية'],
  ['MULTI', 'حركة متعددة'],
  ['RECEIPT', 'سند قبض'],
  ['PAYMENT', 'سند دفع'],
  ['EXCHANGE', 'تصريف'],
];

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query('SELECT movement_code FROM movement_types');
    const existing = new Set(rows.map((r) => r.movement_code));
    const missing = TYPES.filter(([code]) => !existing.has(code)).map(([movement_code, movement_name]) => ({
      movement_code,
      movement_name,
      is_active: true,
    }));
    if (missing.length > 0) {
      await queryInterface.bulkInsert('movement_types', missing);
      console.info(`[movement_types] added: ${missing.map((m) => m.movement_code).join(', ')}`);
    }
  },
  // بيانات مرجعية نظامية — لا تُحذف عند التراجع.
  async down() {},
};
