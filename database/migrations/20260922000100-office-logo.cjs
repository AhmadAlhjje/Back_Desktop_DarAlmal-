'use strict';

/**
 * لوغو المكتب يُدار من لوحة التحكم (قرار المستخدم 2026-09-21): يُغيَّر من اللوحة متى شاء المالك،
 * ويصل إلى تطبيق المكتب فيحلّ محل اللوغو المحلي (الذي يبقى «مرة واحدة» داخل التطبيق).
 * `logo_path` مسار الملف تحت uploads/offices، و`logo_updated_at` نسخة يعرف بها التطبيق أنه تغيّر.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('offices', 'logo_path', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addColumn('offices', 'logo_updated_at', { type: Sequelize.DATE, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('offices', 'logo_updated_at');
    await queryInterface.removeColumn('offices', 'logo_path');
  },
};
