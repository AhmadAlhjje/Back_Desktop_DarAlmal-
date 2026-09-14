'use strict';

/**
 * العملات الأساسية الأربع (قرار المستخدم 2026-09-15): دولار، ليرة سوري، يورو، ليرة تركي.
 * تُبذر مع النظام وتُعلَّم `is_system` فلا يُعدَّل فيها إلا سعر الصرف ولا تُعطَّل ولا تُحذف.
 * آمن للتكرار: الموجود بالرمز نفسه يُعلَّم فقط (ويُكمَل علم الدولة إن كان فارغاً)، والمفقود يُدرج.
 */
const SYSTEM_CURRENCIES = [
  { currency_code: 'USD', currency_name: 'دولار', currency_symbol: '$', text_icon: 'US', importance: 100000, exchange_rate: '1.0000000000' },
  { currency_code: 'SYP', currency_name: 'ليرة سوري', currency_symbol: 'ل.س', text_icon: 'SY', importance: 99999, exchange_rate: '13150.0000000000' },
  { currency_code: 'EUR', currency_name: 'يورو', currency_symbol: '€', text_icon: 'EU', importance: 99998, exchange_rate: '1.0000000000' },
  { currency_code: 'TRY', currency_name: 'ليرة تركي', currency_symbol: '₺', text_icon: 'TR', importance: 99997, exchange_rate: '1.0000000000' },
];

module.exports = {
  async up(queryInterface) {
    const codes = SYSTEM_CURRENCIES.map((c) => `'${c.currency_code}'`).join(', ');
    const [existing] = await queryInterface.sequelize.query(
      `SELECT currency_code, text_icon FROM currencies WHERE currency_code IN (${codes})`,
    );
    const present = new Map(existing.map((r) => [r.currency_code, r]));
    for (const c of SYSTEM_CURRENCIES) {
      const row = present.get(c.currency_code);
      if (row) {
        await queryInterface.sequelize.query(
          'UPDATE currencies SET is_system = 1, is_active = 1, text_icon = COALESCE(text_icon, :icon) WHERE currency_code = :code',
          { replacements: { icon: c.text_icon, code: c.currency_code } },
        );
      } else {
        await queryInterface.bulkInsert('currencies', [
          {
            ...c,
            decimal_places: 2,
            icon_path: null,
            exchange_type: 'FROM_USD_MULTIPLY',
            is_active: true,
            is_system: true,
            created_at: new Date(),
          },
        ]);
      }
    }
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query("UPDATE currencies SET is_system = 0 WHERE currency_code IN ('USD', 'SYP', 'EUR', 'TRY')");
  },
};
