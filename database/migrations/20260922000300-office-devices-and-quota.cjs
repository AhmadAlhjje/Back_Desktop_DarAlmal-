'use strict';

/**
 * (1) حد الحركات لكل مكتب (قرار المستخدم 2026-09-22): `movement_limit` (null = بلا حد) و`movements_used`
 *     عدّاد الإضافات فقط (التعديل/الإلغاء/العكس لا يزيده). بلوغ الحد يقفل التطبيق كالتعطيل حتى يرفع
 *     المالك الحد من لوحة التحكم. يُهيَّأ العدّاد بعدد الحركات الحالية.
 * (2) أجهزة المكتب: كود المكتب يُستهلك مرة واحدة عند أول دخول على جهاز، فيُصدَر للجهاز مفتاح دائم
 *     (يُخزَّن مجزَّأً) ويتولّد كود جديد يظهر في اللوحة فقط.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('offices', 'movement_limit', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await queryInterface.addColumn('offices', 'movements_used', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 });
    await queryInterface.sequelize.query(
      'UPDATE offices o SET movements_used = (SELECT COUNT(*) FROM movements m WHERE m.office_id = o.id_office)',
    );
    await queryInterface.createTable('office_devices', {
      id_device: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      office_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'offices', key: 'id_office' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      key_hash: { type: Sequelize.CHAR(64), allowNull: false, unique: true },
      label: { type: Sequelize.STRING(150), allowNull: true },
      enrolled_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      last_seen_at: { type: Sequelize.DATE, allowNull: true },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('office_devices', ['office_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('office_devices');
    await queryInterface.removeColumn('offices', 'movements_used');
    await queryInterface.removeColumn('offices', 'movement_limit');
  },
};
