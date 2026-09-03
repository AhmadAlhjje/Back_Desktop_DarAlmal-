'use strict';

async function swapExchangeTotals(queryInterface) {
  await queryInterface.sequelize.query(`
    UPDATE exchange_movements current_row
    JOIN (
      SELECT id_exchange, total_us AS previous_us, total_them AS previous_them
      FROM exchange_movements
    ) previous_row ON previous_row.id_exchange = current_row.id_exchange
    SET current_row.total_us = previous_row.previous_them,
        current_row.total_them = previous_row.previous_us
  `);
}

module.exports = {
  async up(queryInterface) {
    await swapExchangeTotals(queryInterface);
  },

  async down(queryInterface) {
    await swapExchangeTotals(queryInterface);
  },
};
