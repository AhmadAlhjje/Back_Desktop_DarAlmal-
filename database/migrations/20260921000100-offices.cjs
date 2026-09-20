'use strict';

const crypto = require('node:crypto');

/**
 * تعدد المكاتب في باك اند واحد (قرار المستخدم 2026-09-20):
 * - جدول `offices` (المستأجرون) يحمل كود المكتب (يُولَّد مرة واحدة) وحالة الترخيص
 *   (`ACTIVE`/`SUSPENDED`/`EXPIRED`, `expires_at`, `message`) وبيانات التواصل.
 * - كل جدول تجاري يحصل على `office_id` (FK إلى `offices`)؛ البيانات الموجودة تُنسب إلى مكتب
 *   افتراضي يُنشأ هنا (كوده من `DEFAULT_OFFICE_CODE` أو يُولَّد ويُطبع في السجل).
 * - القيود الفريدة تصبح لكل مكتب: (office_id, full_name) للإداريين، (office_id, client_code)،
 *   (office_id, currency_code)، (office_id, movement_no) — رقم الحركة متسلسل لكل مكتب.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = () =>
  Array.from(crypto.randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('');

const SCOPED = ['admins', 'client_groups', 'clients', 'currencies', 'movements', 'journal_entries', 'notifications'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    await queryInterface.createTable('offices', {
      id_office: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      code: { type: Sequelize.STRING(16), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      status: { type: Sequelize.ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED'), allowNull: false, defaultValue: 'ACTIVE' },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      message: { type: Sequelize.STRING(500), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      address: { type: Sequelize.STRING(255), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // المكتب الافتراضي للبيانات الموجودة (وللبذور في تثبيت جديد).
    const code = (process.env.DEFAULT_OFFICE_CODE || generateCode()).toUpperCase();
    await queryInterface.bulkInsert('offices', [{ code, name: process.env.DEFAULT_OFFICE_NAME || 'المكتب الرئيسي', status: 'ACTIVE' }]);
    const [rows] = await sequelize.query('SELECT id_office FROM offices WHERE code = :code', { replacements: { code } });
    const officeId = rows[0].id_office;
    console.info(`[offices] default office created: code=${code} id=${officeId}`);

    for (const table of SCOPED) {
      await queryInterface.addColumn(table, 'office_id', { type: Sequelize.BIGINT.UNSIGNED, allowNull: true });
      await sequelize.query(`UPDATE \`${table}\` SET office_id = :officeId`, { replacements: { officeId } });
      await queryInterface.changeColumn(table, 'office_id', { type: Sequelize.BIGINT.UNSIGNED, allowNull: false });
      await queryInterface.addConstraint(table, {
        fields: ['office_id'],
        type: 'foreign key',
        name: `fk_${table}_office`,
        references: { table: 'offices', field: 'id_office' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    // القيود الفريدة لكل مكتب بدل العامة.
    await queryInterface.removeIndex('admins', 'uq_admins_full_name');
    await queryInterface.addIndex('admins', ['office_id', 'full_name'], { unique: true, name: 'uq_admins_office_full_name' });
    await queryInterface.removeIndex('admins', 'email');
    await queryInterface.addIndex('admins', ['office_id', 'email'], { unique: true, name: 'uq_admins_office_email' });
    await queryInterface.removeIndex('clients', 'client_code');
    await queryInterface.addIndex('clients', ['office_id', 'client_code'], { unique: true, name: 'uq_clients_office_code' });
    await queryInterface.removeIndex('currencies', 'currency_code');
    await queryInterface.addIndex('currencies', ['office_id', 'currency_code'], { unique: true, name: 'uq_currencies_office_code' });
    await queryInterface.removeIndex('movements', 'movement_no');
    await queryInterface.addIndex('movements', ['office_id', 'movement_no'], { unique: true, name: 'uq_movements_office_no' });
    await queryInterface.addIndex('journal_entries', ['office_id', 'client_id', 'currency_id'], { name: 'idx_journal_office_client_currency' });
    await queryInterface.addIndex('notifications', ['office_id', 'admin_id'], { name: 'idx_notifications_office_admin' });
    await queryInterface.addIndex('client_groups', ['office_id'], { name: 'idx_client_groups_office' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('client_groups', 'idx_client_groups_office');
    await queryInterface.removeIndex('notifications', 'idx_notifications_office_admin');
    await queryInterface.removeIndex('journal_entries', 'idx_journal_office_client_currency');
    await queryInterface.removeIndex('movements', 'uq_movements_office_no');
    await queryInterface.addIndex('movements', ['movement_no'], { unique: true, name: 'movement_no' });
    await queryInterface.removeIndex('currencies', 'uq_currencies_office_code');
    await queryInterface.addIndex('currencies', ['currency_code'], { unique: true, name: 'currency_code' });
    await queryInterface.removeIndex('clients', 'uq_clients_office_code');
    await queryInterface.addIndex('clients', ['client_code'], { unique: true, name: 'client_code' });
    await queryInterface.removeIndex('admins', 'uq_admins_office_email');
    await queryInterface.addIndex('admins', ['email'], { unique: true, name: 'email' });
    await queryInterface.removeIndex('admins', 'uq_admins_office_full_name');
    await queryInterface.addIndex('admins', ['full_name'], { unique: true, name: 'uq_admins_full_name' });
    for (const table of [...SCOPED].reverse()) {
      await queryInterface.removeConstraint(table, `fk_${table}_office`);
      await queryInterface.removeColumn(table, 'office_id');
    }
    await queryInterface.dropTable('offices');
  },
};
