'use strict';

/**
 * عكس الحركة في مكانها (قرار المستخدم 2026-09-15): بدل إنشاء حركة عكسية جديدة تُقلب أطراف الحركة نفسها
 * (بنفس الرقم) وتبقى POSTED؛ `reversed_at/reversed_by` يوثّقان أنها معكوسة (عكسها مرة أخرى يعيدها).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('movements', 'reversed_at', { type: Sequelize.DATE, allowNull: true, after: 'updated_by' });
    await queryInterface.addColumn('movements', 'reversed_by', { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, after: 'reversed_at' });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('movements', 'reversed_by');
    await queryInterface.removeColumn('movements', 'reversed_at');
  },
};
