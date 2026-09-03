'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'currencies',
      [
        ['US Dollar', 'USD', '$', 2],
        ['Syrian Pound', 'SYP', 'ل.س', 2],
        ['Euro', 'EUR', '€', 2],
        ['Turkish Lira', 'TRY', '₺', 2],
        ['Saudi Riyal', 'SAR', 'ر.س', 2],
      ].map(([currency_name, currency_code, currency_symbol, decimal_places]) => ({
        currency_name,
        currency_code,
        currency_symbol,
        decimal_places,
        is_active: true,
        created_at: now,
      })),
    );
    await queryInterface.bulkInsert(
      'movement_types',
      [
        ['TRANSFER', 'حركة حوالة'],
        ['SETTLEMENT', 'حركة تسوية'],
        ['MULTI', 'حركة متعددة'],
        ['RECEIPT', 'سند قبض'],
        ['PAYMENT', 'سند دفع'],
        ['EXCHANGE', 'تصريف'],
      ].map(([movement_code, movement_name]) => ({ movement_code, movement_name, is_active: true })),
    );
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('movement_types', {
      movement_code: ['TRANSFER', 'SETTLEMENT', 'MULTI', 'RECEIPT', 'PAYMENT', 'EXCHANGE'],
    });
    await queryInterface.bulkDelete('currencies', { currency_code: ['USD', 'SYP', 'EUR', 'TRY', 'SAR'] });
  },
};
