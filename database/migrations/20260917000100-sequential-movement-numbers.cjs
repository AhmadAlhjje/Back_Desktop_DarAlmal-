'use strict';

/**
 * أرقام الحركات متسلسلة 1، 2، 3… (قرار المستخدم 2026-09-17) بدل المعرّفات الكبيرة العشوائية.
 *
 * يعيد ترقيم الحركات الموجودة حسب تاريخ الإنشاء: `id_movement` و`movement_no` يصبحان 1..N،
 * وكل الجداول التابعة تتبع تلقائياً لأن مفاتيحها الأجنبية معرّفة بـ `ON UPDATE CASCADE`
 * (journal_entries, transfer/exchange/settlement/multi_movements, notifications).
 * ثم يُضبط AUTO_INCREMENT على N+1 ليكمل النظام من هناك.
 *
 * المرحلة الوسيطة تستعمل أرقاماً قرب أقصى قيمة ممكنة (لا سالبة: العمود `bigint unsigned`)
 * كي لا تتصادم مع المعرّفات الحالية أثناء إعادة الترقيم.
 */
const MAX_UNSIGNED_BIGINT = 18446744073709551615n;

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const [rows] = await sequelize.query('SELECT id_movement FROM movements ORDER BY created_at ASC, id_movement ASC');
    if (rows.length === 0) {
      await sequelize.query('ALTER TABLE movements AUTO_INCREMENT = 1');
      return;
    }

    const temporary = (i) => (MAX_UNSIGNED_BIGINT - BigInt(i)).toString();
    const floor = MAX_UNSIGNED_BIGINT - BigInt(rows.length);
    for (const row of rows) {
      if (BigInt(row.id_movement) > floor) {
        throw new Error(`معرّف حركة قريب جداً من الحد الأعلى (${row.id_movement}) — إعادة الترقيم تحتاج تدخّلاً يدوياً.`);
      }
    }

    await sequelize.transaction(async (transaction) => {
      for (let i = 0; i < rows.length; i += 1) {
        await sequelize.query('UPDATE movements SET id_movement = :tmp, movement_no = :tmp WHERE id_movement = :id', {
          replacements: { tmp: temporary(i), id: String(rows[i].id_movement) },
          transaction,
        });
      }
      for (let i = 0; i < rows.length; i += 1) {
        await sequelize.query('UPDATE movements SET id_movement = :n, movement_no = :n WHERE id_movement = :tmp', {
          replacements: { n: i + 1, tmp: temporary(i) },
          transaction,
        });
      }
    });
    await sequelize.query(`ALTER TABLE movements AUTO_INCREMENT = ${rows.length + 1}`);
  },

  async down() {
    // لا رجوع: المعرّفات القديمة العشوائية لا تُستعاد (ولا حاجة لها).
  },
};
