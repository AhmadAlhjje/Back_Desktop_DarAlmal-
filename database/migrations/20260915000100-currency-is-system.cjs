'use strict';

/** العملات الأساسية (قرار المستخدم 2026-09-15): علم `is_system` — لا يُعدَّل فيها إلا سعر الصرف ولا تُعطَّل. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('currencies', 'is_system', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'is_active',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('currencies', 'is_system');
  },
};
