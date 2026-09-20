'use strict';

/**
 * المكتب الافتراضي للبذور (تعدد المكاتب 2026-09-20): كل صف تجاري يحتاج `office_id`.
 * تنشئه هجرة `20260921000100-offices`؛ إن لم يوجد (قاعدة فارغة تماماً) يُنشأ هنا.
 */
module.exports = async function defaultOfficeId(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const [rows] = await sequelize.query('SELECT id_office FROM offices ORDER BY id_office ASC LIMIT 1');
  if (rows.length > 0) return rows[0].id_office;
  const code = (process.env.DEFAULT_OFFICE_CODE || 'MAIN0001').toUpperCase();
  await queryInterface.bulkInsert('offices', [{ code, name: process.env.DEFAULT_OFFICE_NAME || 'المكتب الرئيسي', status: 'ACTIVE' }]);
  const [created] = await sequelize.query('SELECT id_office FROM offices WHERE code = :code', { replacements: { code } });
  return created[0].id_office;
};
