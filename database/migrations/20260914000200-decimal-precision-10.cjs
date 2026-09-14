'use strict';

/**
 * الدقة العشرية 10 منازل (قرار المستخدم 2026-09-14): المبالغ DECIMAL(20,4) → DECIMAL(30,10)،
 * الأسعار DECIMAL(20,8) → DECIMAL(30,10)، نسب الأجور DECIMAL(10,4) → DECIMAL(20,10).
 * لا يغيّر أي قيمة مخزّنة (توسيع فقط)؛ `down` يعيد الأنواع السابقة بتقريب MySQL.
 */
const AMOUNT = { precision: [30, 10], legacy: [20, 4] };
const RATE = { precision: [30, 10], legacy: [20, 8] };
const PCT = { precision: [20, 10], legacy: [10, 4] };

/** [table, column, kind, nullable, defaultValue] */
const COLUMNS = [
  ['currencies', 'exchange_rate', RATE, false, '1'],
  ['movements', 'total_result', AMOUNT, false, '0'],
  ['journal_entries', 'amount_us', AMOUNT, false, '0'],
  ['journal_entries', 'amount_them', AMOUNT, false, '0'],
  ['transfer_movements', 'transfer_amount', AMOUNT, false, null],
  ['transfer_movements', 'first_exchange_rate', RATE, false, null],
  ['transfer_movements', 'second_exchange_rate', RATE, false, null],
  ['transfer_movements', 'fee_us', AMOUNT, false, null],
  ['transfer_movements', 'fee_them', AMOUNT, false, null],
  ['transfer_movements', 'fee_us_percentage', PCT, true, null],
  ['transfer_movements', 'fee_them_percentage', PCT, true, null],
  ['transfer_movements', 'total_us', AMOUNT, false, null],
  ['transfer_movements', 'total_them', AMOUNT, false, null],
  ['exchange_movements', 'exchange_rate', RATE, false, null],
  ['exchange_movements', 'total_us', AMOUNT, false, null],
  ['exchange_movements', 'total_them', AMOUNT, false, null],
  ['exchange_movements', 'result', AMOUNT, false, null],
  ['multi_movements', 'amount', AMOUNT, false, null],
  ['settlement_movements', 'first_amount', AMOUNT, false, null],
  ['settlement_movements', 'second_amount', AMOUNT, true, null],
];

async function apply(queryInterface, Sequelize, key) {
  const tables = new Set(await queryInterface.showAllTables());
  for (const [table, column, kind, nullable, def] of COLUMNS) {
    if (!tables.has(table)) continue;
    const described = await queryInterface.describeTable(table);
    if (!described[column]) continue;
    const [p, s] = kind[key];
    await queryInterface.changeColumn(table, column, {
      type: Sequelize.DECIMAL(p, s),
      allowNull: nullable,
      ...(def !== null ? { defaultValue: def } : {}),
    });
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await apply(queryInterface, Sequelize, 'precision');
  },
  async down(queryInterface, Sequelize) {
    await apply(queryInterface, Sequelize, 'legacy');
  },
};
