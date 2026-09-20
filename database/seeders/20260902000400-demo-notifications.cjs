'use strict';

module.exports = {
  async up(queryInterface) {
    // بيانات وهمية للتجربة فقط: لا تُبذر إلا صراحةً (SEED_DEMO_DATA=true) حتى تبقى النسخ المسلَّمة نظيفة.
    if (process.env.SEED_DEMO_DATA !== 'true') {
      console.log('Demo seed skipped (set SEED_DEMO_DATA=true to load sample data).');
      return;
    }
    const sq = queryInterface.sequelize;

    // جلب ID المدير وأرقام الحركات
    const [[adminRow]] = await sq.query(`SELECT id_admin FROM admins LIMIT 1`);
    const adminId = adminRow.id_admin;

    const movRows = (
      await sq.query(
        `SELECT id_movement, movement_no FROM movements WHERE movement_no BETWEEN 1001 AND 1018 ORDER BY movement_no`,
      )
    )[0];
    const mov = {};
    movRows.forEach((r) => {
      mov[r.movement_no] = r.id_movement;
    });

    const d = (daysAgo, h = 9, m = 0) => {
      const dt = new Date('2026-09-02T00:00:00');
      dt.setDate(dt.getDate() - daysAgo);
      dt.setHours(h, m, 0, 0);
      return dt;
    };

    const office_id = await require('../lib/defaultOffice.cjs')(queryInterface);
    await queryInterface.bulkInsert('notifications', [
      // ── إشعارات الحركات ────────────────────────────────────
      {
        admin_id: adminId,
        office_id,
        title: 'تحويل جديد #1001',
        message: 'تم إنشاء حوالة بقيمة 500 دولار من أحمد السعيد إلى سمر الدريس بنجاح.',
        notification_type: 'MOVEMENT',
        movement_id: mov[1001] || null,
        is_read: true,
        created_at: d(13, 9, 15),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'تحويل جديد #1002',
        message: 'تم إنشاء حوالة بقيمة 800 يورو من فاطمة العمر - برلين إلى شركة النور للتجارة.',
        notification_type: 'MOVEMENT',
        movement_id: mov[1002] || null,
        is_read: true,
        created_at: d(12, 11, 30),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'تحويل جديد #1003',
        message: 'تم إنشاء حوالة بقيمة 2,000 ريال من خالد الزهراني إلى محمود الحسين - دبي.',
        notification_type: 'MOVEMENT',
        movement_id: mov[1003] || null,
        is_read: true,
        created_at: d(11, 14, 0),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'تصريف #1014',
        message: 'عملية تصريف دولار بليرة سورية للعميل رامي الجابر — 200 دولار بسعر 13,500.',
        notification_type: 'MOVEMENT',
        movement_id: mov[1014] || null,
        is_read: true,
        created_at: d(10, 10, 5),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'تحويل جديد #1005',
        message: 'تحويل دولي — 400 دولار من نورا المنصور (الرياض) إلى سارة الكردي (ستوكهولم).',
        notification_type: 'MOVEMENT',
        movement_id: mov[1005] || null,
        is_read: true,
        created_at: d(5, 16, 20),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'تحويل جديد #1006',
        message: 'تم إنشاء حوالة بقيمة 1,000 دولار من عمر الحربي (الرياض) إلى مؤسسة الأمانة (حلب).',
        notification_type: 'MOVEMENT',
        movement_id: mov[1006] || null,
        is_read: false,
        created_at: d(1, 8, 30),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'سند قبض #1010',
        message: 'تم تسجيل قبض 500 يورو من فاطمة العمر.',
        notification_type: 'MOVEMENT',
        movement_id: mov[1010] || null,
        is_read: false,
        created_at: d(0, 10, 15),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'تصريف #1016',
        message: 'تصريف 3,250 ليرة تركية بـ 100 دولار للعميل سمر الدريس.',
        notification_type: 'MOVEMENT',
        movement_id: mov[1016] || null,
        is_read: false,
        created_at: d(0, 9, 0),
      },
      // ── إشعارات تنبيه ──────────────────────────────────────
      {
        admin_id: adminId,
        office_id,
        title: 'تنبيه: تسوية حساب أغسطس',
        message: 'تم إغلاق تسوية شهر أغسطس بين أحمد السعيد وسمر الدريس. الرجاء مراجعة الأرصدة.',
        notification_type: 'ALERT',
        movement_id: mov[1017] || null,
        is_read: true,
        created_at: d(2, 17, 0),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'تنبيه: تسوية شركة النور',
        message: 'تمت تسوية الحساب الشهري مع شركة النور للتجارة ومؤسسة الأمانة. المبلغ: 250 دولار.',
        notification_type: 'ALERT',
        movement_id: mov[1018] || null,
        is_read: false,
        created_at: d(1, 16, 0),
      },
      // ── إشعارات النظام ─────────────────────────────────────
      {
        admin_id: adminId,
        office_id,
        title: 'مرحباً بك في ميزان',
        message: 'تم تسجيل دخولك بنجاح. آخر دخول كان من نفس الجهاز.',
        notification_type: 'SYSTEM',
        movement_id: null,
        is_read: true,
        created_at: d(15, 8, 0),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'إشعار: سعر الصرف',
        message: 'تذكير: سعر الدولار مقابل الليرة السورية يتراوح اليوم بين 13,450 و13,520. يرجى تحديث أسعار الصرف.',
        notification_type: 'INFO',
        movement_id: null,
        is_read: true,
        created_at: d(3, 7, 30),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'نهاية الشهر: مراجعة الأرصدة',
        message: 'اقترب نهاية شهر أغسطس. يُنصح بمراجعة أرصدة العملاء والتحقق من التسويات المعلقة.',
        notification_type: 'INFO',
        movement_id: null,
        is_read: false,
        created_at: d(2, 8, 0),
      },
      {
        admin_id: adminId,
        office_id,
        title: 'عميل جديد: سارة الكردي',
        message: 'تم تسجيل العميلة سارة وليد الكردي (C004) في مجموعة المغتربين السوريين.',
        notification_type: 'INFO',
        movement_id: null,
        is_read: false,
        created_at: d(0, 11, 0),
      },
    ]);

    console.log('✅ Notifications seeded: 14 notifications (5 unread)');
  },

  async down(queryInterface) {
    const sq = queryInterface.sequelize;
    const [[adminRow]] = await sq.query(`SELECT id_admin FROM admins LIMIT 1`);
    await queryInterface.bulkDelete('notifications', { admin_id: adminRow.id_admin });
  },
};
