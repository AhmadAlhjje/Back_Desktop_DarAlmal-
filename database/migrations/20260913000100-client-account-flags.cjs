'use strict';

/**
 * أعلام الحساب على جدول العملاء (معتمد 2026-09-13 — قرار ج1):
 * - account_type   : CLIENT (عميل) | BOX (صندوق)
 * - is_system      : حساب نظامي يُبذر مع النظام ولا يُحذف ولا يُؤرشف
 * - is_cash_box    : الحساب المعيّن كـ «حساب الصندوق» لسندات القبض والدفع (واحد فقط)
 * - is_secret      : حساب سرّي لا يظهر إلا لدور ADMIN
 * - archived_at    : تاريخ الأرشفة (NULL = نشط)
 * - last_rollover_at: آخر «تدوير أرصدة» (بداية فترة كشف الحساب الافتراضية)
 * لا تغيير على القيود المالية؛ journal_entries يبقى مصدر الحقيقة.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clients', 'account_type', {
      type: Sequelize.ENUM('CLIENT', 'BOX'),
      allowNull: false,
      defaultValue: 'CLIENT',
      after: 'importance',
    });
    await queryInterface.addColumn('clients', 'is_system', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'account_type',
    });
    await queryInterface.addColumn('clients', 'is_cash_box', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'is_system',
    });
    await queryInterface.addColumn('clients', 'is_secret', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'is_cash_box',
    });
    await queryInterface.addColumn('clients', 'archived_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'is_secret',
    });
    await queryInterface.addColumn('clients', 'last_rollover_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'archived_at',
    });
    await queryInterface.addIndex('clients', ['archived_at'], { name: 'idx_clients_archived_at' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('clients', 'idx_clients_archived_at');
    for (const column of ['last_rollover_at', 'archived_at', 'is_secret', 'is_cash_box', 'is_system', 'account_type']) {
      await queryInterface.removeColumn('clients', column);
    }
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS `enum_clients_account_type`').catch(() => undefined);
  },
};
