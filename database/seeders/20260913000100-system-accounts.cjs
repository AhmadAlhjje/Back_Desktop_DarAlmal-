'use strict';

const defaultOfficeId = require('../lib/defaultOffice.cjs');

/**
 * الصناديق النظامية (قرار ج3): تُبذر مع النظام ولا يمكن حذفها أو أرشفتها.
 * - SYS-CASH «الصندوق الرئيسي»: معيّن افتراضياً كحساب الصندوق لسندات القبض والدفع.
 * - SYS-PNL  «أرباح وخسائر التصريف»: الصندوق الافتراضي لعرض نتيجة التصريف.
 * البذر آمن للتكرار: لا يُدرج ما هو موجود مسبقاً بالرمز نفسه.
 */
const SYSTEM_ACCOUNTS = [
  { client_code: 'SYS-CASH', full_name: 'الصندوق الرئيسي', is_cash_box: true, importance: 100000 },
  { client_code: 'SYS-PNL', full_name: 'أرباح وخسائر التصريف', is_cash_box: false, importance: 99999 },
];

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT client_code FROM clients WHERE client_code IN ('SYS-CASH', 'SYS-PNL')",
    );
    const present = new Set(existing.map((r) => r.client_code));
    const [cashBoxes] = await queryInterface.sequelize.query('SELECT COUNT(*) AS c FROM clients WHERE is_cash_box = 1');
    const hasCashBox = Number(cashBoxes[0]?.c ?? 0) > 0;
    const now = new Date();
    const office_id = await defaultOfficeId(queryInterface);
    const rows = SYSTEM_ACCOUNTS.filter((a) => !present.has(a.client_code)).map((a) => ({
      client_code: a.client_code,
      group_id: null,
      full_name: a.full_name,
      phone: null,
      email: null,
      address: null,
      importance: a.importance,
      account_type: 'BOX',
      is_system: true,
      is_cash_box: a.is_cash_box && !hasCashBox,
      is_secret: false,
      archived_at: null,
      last_rollover_at: null,
      office_id,
      created_at: now,
      updated_at: now,
    }));
    if (rows.length > 0) await queryInterface.bulkInsert('clients', rows);
  },

  async down(queryInterface) {
    // لا تُحذف إن كانت لها قيود يومية (RESTRICT يحمي التاريخ المالي).
    await queryInterface.sequelize.query(
      "DELETE FROM clients WHERE client_code IN ('SYS-CASH', 'SYS-PNL') AND id_client NOT IN (SELECT DISTINCT client_id FROM journal_entries)",
    );
  },
};
