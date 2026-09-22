'use strict';

/**
 * إعلان المنصّة (قرار المستخدم 2026-09-23): صفّ واحد (id_notice = 1) يكتب فيه المالك رسالة
 * ويفعّلها من لوحة التحكم، فتُعرض على كل التطبيقات ويتوقّف التطبيق عن العمل حتى يُلغيها.
 * الفحص يتم عند إقلاع التطبيق وتسجيل الدخول فقط، فلا تُقاطَع جلسة جارية.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('platform_notice', {
      id_notice: { type: Sequelize.TINYINT.UNSIGNED, primaryKey: true, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      title: { type: Sequelize.STRING(150), allowNull: true },
      message: { type: Sequelize.TEXT, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.sequelize.query(
      "INSERT INTO platform_notice (id_notice, is_active, title, message, updated_at) VALUES (1, 0, NULL, '', NOW())",
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable('platform_notice');
  },
};
