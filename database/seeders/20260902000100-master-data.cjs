'use strict';

const defaultOfficeId = require('../lib/defaultOffice.cjs');

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const office_id = await defaultOfficeId(queryInterface);
    // العملات الأساسية الأربع (قرار المستخدم 2026-09-15): ثابتة، يُعدَّل سعر صرفها فقط.
    await queryInterface.bulkInsert(
      'currencies',
      [
        ['دولار', 'USD', '$', 'US', 100000],
        ['ليرة سوري', 'SYP', 'ل.س', 'SY', 99999],
        ['يورو', 'EUR', '€', 'EU', 99998],
        ['ليرة تركي', 'TRY', '₺', 'TR', 99997],
      ].map(([currency_name, currency_code, currency_symbol, text_icon, importance]) => ({
        currency_name,
        currency_code,
        currency_symbol,
        text_icon,
        importance,
        decimal_places: 2,
        exchange_rate: '1.0000000000',
        exchange_type: 'FROM_USD_MULTIPLY',
        is_active: true,
        is_system: true,
        office_id,
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
    await queryInterface.bulkDelete('currencies', { currency_code: ['USD', 'SYP', 'EUR', 'TRY'] });
  },
};
