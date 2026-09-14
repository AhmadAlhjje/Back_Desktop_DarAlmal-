'use strict';

/**
 * 20260902000300-demo-data.cjs
 * بيانات وهمية واقعية لمكتب حوالة سوري
 *
 * يفترض وجود:
 *   - currencies:      USD(1) SYP(2) EUR(3) TRY(4) SAR(5)
 *   - movement_types:  TRANSFER(1) SETTLEMENT(2) MULTI(3) RECEIPT(4) PAYMENT(5) EXCHANGE(6)
 *   - admins:          مدير النظام موجود مسبقاً
 */

module.exports = {
  async up(queryInterface) {
    // بيانات وهمية للتجربة فقط: لا تُبذر إلا صراحةً (SEED_DEMO_DATA=true) حتى تبقى النسخ المسلَّمة نظيفة.
    if (process.env.SEED_DEMO_DATA !== 'true') {
      console.log('Demo seed skipped (set SEED_DEMO_DATA=true to load sample data).');
      return;
    }
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('transfer_details')) {
      console.log(
        'Demo seed uses the legacy schema and was skipped; use the API collection with the redesigned schema.',
      );
      return;
    }
    const sq = queryInterface.sequelize;
    const now = new Date();

    // ══════════════════════════════════════════════════════════
    //  1. مجموعات العملاء
    // ══════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('client_groups', [
      { group_name: 'مغتربون سوريون', description: 'عملاء مقيمون خارج سوريا', is_active: true, created_at: now },
      { group_name: 'شركات ومؤسسات', description: 'الشركات التجارية والمؤسسات', is_active: true, created_at: now },
      { group_name: 'عملاء VIP', description: 'عملاء ذوو حجم تعاملات كبير', is_active: true, created_at: now },
      { group_name: 'عملاء عاديون', description: null, is_active: true, created_at: now },
    ]);

    const [[groups]] = await sq.query(`SELECT id_group FROM client_groups ORDER BY id_group LIMIT 4`);
    // groups = array of { id_group }
    const [g1, g2, g3, g4] = (await sq.query(`SELECT id_group FROM client_groups ORDER BY id_group LIMIT 4`))[0].map(
      (r) => r.id_group,
    );

    // ══════════════════════════════════════════════════════════
    //  2. العملاء (12 عميل)
    // ══════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('clients', [
      // مغتربون سوريون
      {
        client_code: 'C001',
        group_id: g1,
        full_name: 'أحمد محمد السعيد',
        phone: '0991234567',
        email: null,
        address: 'إسطنبول - تركيا',
        notes: 'مغترب منذ 2019',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        client_code: 'C002',
        group_id: g1,
        full_name: 'فاطمة خالد العمر',
        phone: '0997654321',
        email: 'fatima@mail.com',
        address: 'برلين - ألمانيا',
        notes: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        client_code: 'C003',
        group_id: g1,
        full_name: 'محمود يوسف الحسين',
        phone: '0993456789',
        email: null,
        address: 'دبي - الإمارات',
        notes: 'عميل منتظم',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        client_code: 'C004',
        group_id: g1,
        full_name: 'سارة وليد الكردي',
        phone: null,
        email: 'sara.k@gmail.com',
        address: 'ستوكهولم - السويد',
        notes: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      // شركات
      {
        client_code: 'C005',
        group_id: g2,
        full_name: 'شركة النور للتجارة',
        phone: '0112345678',
        email: 'alnoor@trade.sy',
        address: 'دمشق - الميدان',
        notes: 'تجارة المواد الغذائية',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        client_code: 'C006',
        group_id: g2,
        full_name: 'مؤسسة الأمانة للاستيراد',
        phone: '0213456789',
        email: null,
        address: 'حلب - السكري',
        notes: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      // VIP
      {
        client_code: 'C007',
        group_id: g3,
        full_name: 'خالد عبدالرحمن الزهراني',
        phone: '0501234567',
        email: 'khalid@hotmail.com',
        address: 'جدة - السعودية',
        notes: 'تحويلات شهرية منتظمة',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        client_code: 'C008',
        group_id: g3,
        full_name: 'نورا سعيد المنصور',
        phone: '0559876543',
        email: null,
        address: 'الرياض - السعودية',
        notes: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        client_code: 'C009',
        group_id: g3,
        full_name: 'عمر فيصل الحربي',
        phone: '0542345678',
        email: 'omar.h@gmail.com',
        address: 'الرياض - السعودية',
        notes: 'VIP منذ 2022',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      // عاديون
      {
        client_code: 'C010',
        group_id: g4,
        full_name: 'سمر أحمد الدريس',
        phone: '0991122334',
        email: null,
        address: 'دمشق - المزة',
        notes: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        client_code: 'C011',
        group_id: g4,
        full_name: 'بشير محمد القاسم',
        phone: '0993344556',
        email: null,
        address: 'اللاذقية',
        notes: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        client_code: 'C012',
        group_id: g4,
        full_name: 'رامي وليد الجابر',
        phone: '0994455667',
        email: 'rami.j@yahoo.com',
        address: 'حمص - وادي الذهب',
        notes: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    // جلب IDs العملاء والعملات والأنواع والمدير
    const clientRows = (await sq.query(`SELECT id_client, client_code FROM clients ORDER BY id_client`))[0];
    const c = {};
    clientRows.forEach((r) => {
      c[r.client_code] = r.id_client;
    });

    const currRows = (await sq.query(`SELECT id_currency, currency_code FROM currencies`))[0];
    const cur = {};
    currRows.forEach((r) => {
      cur[r.currency_code] = r.id_currency;
    });

    const typeRows = (await sq.query(`SELECT id_movement_type, movement_code FROM movement_types`))[0];
    const mt = {};
    typeRows.forEach((r) => {
      mt[r.movement_code] = r.id_movement_type;
    });

    const [[adminRow]] = await sq.query(`SELECT id_admin FROM admins LIMIT 1`);
    const adminId = adminRow.id_admin;

    // ══════════════════════════════════════════════════════════
    //  3. الحركات المالية
    //     كل حركة = صف في movements + صف في جدول التفاصيل + صفوف في journal_entries
    // ══════════════════════════════════════════════════════════

    // Helper: insert one movement and return its id
    async function insertMovement({
      no,
      typeCode,
      clientId,
      description,
      date,
      time,
      totalResult = '0.0000',
      status = 'POSTED',
    }) {
      await sq.query(
        `
        INSERT INTO movements (movement_no, movement_type_id, client_id, description, movement_date, movement_time, total_result, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
        {
          replacements: [
            no,
            mt[typeCode],
            clientId || null,
            description || null,
            date,
            time,
            totalResult,
            status,
            adminId,
          ],
        },
      );
      const [[{ id }]] = await sq.query(`SELECT id_movement AS id FROM movements WHERE movement_no = ?`, {
        replacements: [no],
      });
      return id;
    }

    // Helper: insert journal entry
    async function insertEntry({
      movId,
      clientId,
      currCode,
      amount,
      side,
      exchangeRate,
      fees,
      description,
      date,
      time,
    }) {
      await sq.query(
        `
        INSERT INTO journal_entries (movement_id, line_no, client_id, currency_id, amount, entry_side, exchange_rate, fees, description, movement_date, movement_time, created_at)
        VALUES (?, (SELECT COALESCE(MAX(line_no),0)+1 FROM journal_entries je2 WHERE je2.movement_id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
        {
          replacements: [
            movId,
            movId,
            clientId,
            cur[currCode],
            amount,
            side,
            exchangeRate || null,
            fees || '0.0000',
            description || null,
            date,
            time,
          ],
        },
      );
    }

    // ── التحويلات (TRANSFER) ──────────────────────────────────
    // T-001: أحمد في تركيا يرسل 500 دولار إلى عائلته في دمشق (سمر)
    let movId = await insertMovement({
      no: 1001,
      typeCode: 'TRANSFER',
      clientId: c['C001'],
      description: 'تحويل لعائلة السعيد - دمشق',
      date: '2026-08-20',
      time: '09:15:00',
      totalResult: '8.00',
    });
    await sq.query(
      `INSERT INTO transfer_details VALUES (NULL,?,?,500.0000,?,?,?,1.00000000,5.0000,NULL,505.0000,NULL,?,?,1.00000000,3.0000,NULL,6756497.0000,NULL)`,
      { replacements: [movId, c['C001'], cur['USD'], c['C001'], cur['USD'], c['C010'], cur['SYP']] },
    );
    await insertEntry({
      movId,
      clientId: c['C001'],
      currCode: 'USD',
      amount: '505.0000',
      side: 'US',
      exchangeRate: '1.00000000',
      fees: '5.0000',
      description: 'استلام من أحمد السعيد - إسطنبول',
      date: '2026-08-20',
      time: '09:15:00',
    });
    await insertEntry({
      movId,
      clientId: c['C010'],
      currCode: 'SYP',
      amount: '6756497.0000',
      side: 'THEM',
      exchangeRate: '13513.00000000',
      fees: '3.0000',
      description: 'تسليم لسمر الدريس - دمشق',
      date: '2026-08-20',
      time: '09:15:00',
    });

    // T-002: فاطمة في برلين ترسل 800 يورو إلى شركة النور
    movId = await insertMovement({
      no: 1002,
      typeCode: 'TRANSFER',
      clientId: c['C002'],
      description: 'تحويل تجاري - برلين إلى دمشق',
      date: '2026-08-21',
      time: '11:30:00',
      totalResult: '15.00',
    });
    await sq.query(
      `INSERT INTO transfer_details VALUES (NULL,?,?,800.0000,?,?,?,1.07520000,10.0000,NULL,810.0000,?,?,?,1.00000000,5.0000,NULL,810.0000,NULL)`,
      { replacements: [movId, c['C002'], cur['EUR'], c['C002'], cur['EUR'], 'رسوم إرسال', c['C005'], cur['USD']] },
    );
    await insertEntry({
      movId,
      clientId: c['C002'],
      currCode: 'EUR',
      amount: '810.0000',
      side: 'US',
      exchangeRate: '1.07520000',
      fees: '10.0000',
      description: 'استلام من فاطمة - برلين',
      date: '2026-08-21',
      time: '11:30:00',
    });
    await insertEntry({
      movId,
      clientId: c['C005'],
      currCode: 'USD',
      amount: '810.0000',
      side: 'THEM',
      exchangeRate: '1.00000000',
      fees: '5.0000',
      description: 'تسليم لشركة النور',
      date: '2026-08-21',
      time: '11:30:00',
    });

    // T-003: خالد من جدة يرسل 2000 ريال إلى محمود في دبي
    movId = await insertMovement({
      no: 1003,
      typeCode: 'TRANSFER',
      clientId: c['C007'],
      description: 'تحويل جدة - دبي',
      date: '2026-08-22',
      time: '14:00:00',
      totalResult: '20.00',
    });
    await sq.query(
      `INSERT INTO transfer_details VALUES (NULL,?,?,2000.0000,?,?,?,0.26667000,15.0000,NULL,2015.0000,NULL,?,?,0.26667000,5.0000,NULL,2005.0000,NULL)`,
      { replacements: [movId, c['C007'], cur['SAR'], c['C007'], cur['SAR'], c['C003'], cur['SAR']] },
    );
    await insertEntry({
      movId,
      clientId: c['C007'],
      currCode: 'SAR',
      amount: '2015.0000',
      side: 'US',
      exchangeRate: '0.26667000',
      fees: '15.0000',
      description: 'استلام من خالد الزهراني',
      date: '2026-08-22',
      time: '14:00:00',
    });
    await insertEntry({
      movId,
      clientId: c['C003'],
      currCode: 'SAR',
      amount: '2005.0000',
      side: 'THEM',
      exchangeRate: '0.26667000',
      fees: '5.0000',
      description: 'تسليم لمحمود الحسين - دبي',
      date: '2026-08-22',
      time: '14:00:00',
    });

    // T-004: رامي يرسل 300 دولار إلى بشير في اللاذقية
    movId = await insertMovement({
      no: 1004,
      typeCode: 'TRANSFER',
      clientId: c['C012'],
      description: 'تحويل شخصي - حمص إلى اللاذقية',
      date: '2026-08-25',
      time: '10:45:00',
      totalResult: '5.00',
    });
    await sq.query(
      `INSERT INTO transfer_details VALUES (NULL,?,?,300.0000,?,?,?,1.00000000,3.0000,NULL,303.0000,NULL,?,?,1.00000000,2.0000,NULL,4052700.0000,NULL)`,
      { replacements: [movId, c['C012'], cur['USD'], c['C012'], cur['USD'], c['C011'], cur['SYP']] },
    );
    await insertEntry({
      movId,
      clientId: c['C012'],
      currCode: 'USD',
      amount: '303.0000',
      side: 'US',
      exchangeRate: '1.00000000',
      fees: '3.0000',
      description: 'استلام من رامي الجابر',
      date: '2026-08-25',
      time: '10:45:00',
    });
    await insertEntry({
      movId,
      clientId: c['C011'],
      currCode: 'SYP',
      amount: '4052700.0000',
      side: 'THEM',
      exchangeRate: '13500.00000000',
      fees: '2.0000',
      description: 'تسليم لبشير القاسم - اللاذقية',
      date: '2026-08-25',
      time: '10:45:00',
    });

    // T-005: نورا من الرياض ترسل 1500 ريال إلى سارة في السويد (بالدولار)
    movId = await insertMovement({
      no: 1005,
      typeCode: 'TRANSFER',
      clientId: c['C008'],
      description: 'تحويل دولي - الرياض إلى ستوكهولم',
      date: '2026-08-28',
      time: '16:20:00',
      totalResult: '18.00',
    });
    await sq.query(
      `INSERT INTO transfer_details VALUES (NULL,?,?,400.0000,?,?,?,1.00000000,12.0000,NULL,412.0000,NULL,?,?,0.93000000,6.0000,NULL,366.5400,NULL)`,
      { replacements: [movId, c['C008'], cur['USD'], c['C008'], cur['USD'], c['C004'], cur['EUR']] },
    );
    await insertEntry({
      movId,
      clientId: c['C008'],
      currCode: 'USD',
      amount: '412.0000',
      side: 'US',
      exchangeRate: '1.00000000',
      fees: '12.0000',
      description: 'استلام من نورا المنصور',
      date: '2026-08-28',
      time: '16:20:00',
    });
    await insertEntry({
      movId,
      clientId: c['C004'],
      currCode: 'EUR',
      amount: '366.5400',
      side: 'THEM',
      exchangeRate: '0.93000000',
      fees: '6.0000',
      description: 'تسليم لسارة الكردي - ستوكهولم',
      date: '2026-08-28',
      time: '16:20:00',
    });

    // T-006: عمر يرسل إلى مؤسسة الأمانة في حلب
    movId = await insertMovement({
      no: 1006,
      typeCode: 'TRANSFER',
      clientId: c['C009'],
      description: 'تحويل تجاري - الرياض إلى حلب',
      date: '2026-09-01',
      time: '08:30:00',
      totalResult: '25.00',
    });
    await sq.query(
      `INSERT INTO transfer_details VALUES (NULL,?,?,1000.0000,?,?,?,1.00000000,20.0000,NULL,1020.0000,?,?,?,1.00000000,5.0000,NULL,13567500.0000,NULL)`,
      { replacements: [movId, c['C009'], cur['USD'], c['C009'], cur['USD'], 'رسوم إرسال', c['C006'], cur['SYP']] },
    );
    await insertEntry({
      movId,
      clientId: c['C009'],
      currCode: 'USD',
      amount: '1020.0000',
      side: 'US',
      exchangeRate: '1.00000000',
      fees: '20.0000',
      description: 'استلام من عمر الحربي',
      date: '2026-09-01',
      time: '08:30:00',
    });
    await insertEntry({
      movId,
      clientId: c['C006'],
      currCode: 'SYP',
      amount: '13567500.0000',
      side: 'THEM',
      exchangeRate: '13500.00000000',
      fees: '5.0000',
      description: 'تسليم لمؤسسة الأمانة - حلب',
      date: '2026-09-01',
      time: '08:30:00',
    });

    // ── سندات القبض (RECEIPT) ──────────────────────────────────
    // R-001: استلام 200 دولار من أحمد
    movId = await insertMovement({
      no: 1007,
      typeCode: 'RECEIPT',
      clientId: c['C001'],
      description: 'قبض نقدي - أحمد السعيد',
      date: '2026-08-18',
      time: '09:00:00',
    });
    await sq.query(`INSERT INTO receipt_payment_details VALUES (NULL,?,'RECEIPT','قبض نقدي',?,?,200.0000)`, {
      replacements: [movId, c['C001'], cur['USD']],
    });
    await insertEntry({
      movId,
      clientId: c['C001'],
      currCode: 'USD',
      amount: '200.0000',
      side: 'US',
      description: 'قبض نقدي من أحمد السعيد',
      date: '2026-08-18',
      time: '09:00:00',
    });

    // R-002: استلام 5,000,000 ليرة من سمر
    movId = await insertMovement({
      no: 1008,
      typeCode: 'RECEIPT',
      clientId: c['C010'],
      description: 'قبض ليرات سورية - سمر',
      date: '2026-08-19',
      time: '11:00:00',
    });
    await sq.query(
      `INSERT INTO receipt_payment_details VALUES (NULL,?,'RECEIPT','قبض نقدي بالليرة',?,?,5000000.0000)`,
      { replacements: [movId, c['C010'], cur['SYP']] },
    );
    await insertEntry({
      movId,
      clientId: c['C010'],
      currCode: 'SYP',
      amount: '5000000.0000',
      side: 'US',
      description: 'قبض ليرات سورية من سمر الدريس',
      date: '2026-08-19',
      time: '11:00:00',
    });

    // R-003: استلام 750 ريال من خالد
    movId = await insertMovement({
      no: 1009,
      typeCode: 'RECEIPT',
      clientId: c['C007'],
      description: 'قبض ريال سعودي - خالد',
      date: '2026-08-26',
      time: '13:30:00',
    });
    await sq.query(`INSERT INTO receipt_payment_details VALUES (NULL,?,'RECEIPT',NULL,?,?,750.0000)`, {
      replacements: [movId, c['C007'], cur['SAR']],
    });
    await insertEntry({
      movId,
      clientId: c['C007'],
      currCode: 'SAR',
      amount: '750.0000',
      side: 'US',
      description: 'قبض ريال سعودي من خالد الزهراني',
      date: '2026-08-26',
      time: '13:30:00',
    });

    // R-004: استلام 500 يورو من فاطمة
    movId = await insertMovement({
      no: 1010,
      typeCode: 'RECEIPT',
      clientId: c['C002'],
      description: 'قبض يورو - فاطمة برلين',
      date: '2026-09-02',
      time: '10:15:00',
    });
    await sq.query(`INSERT INTO receipt_payment_details VALUES (NULL,?,'RECEIPT','قبض يورو',?,?,500.0000)`, {
      replacements: [movId, c['C002'], cur['EUR']],
    });
    await insertEntry({
      movId,
      clientId: c['C002'],
      currCode: 'EUR',
      amount: '500.0000',
      side: 'US',
      description: 'قبض يورو من فاطمة العمر',
      date: '2026-09-02',
      time: '10:15:00',
    });

    // ── سندات الدفع (PAYMENT) ──────────────────────────────────
    // P-001: دفع 150 دولار لبشير
    movId = await insertMovement({
      no: 1011,
      typeCode: 'PAYMENT',
      clientId: c['C011'],
      description: 'دفع نقدي - بشير القاسم',
      date: '2026-08-20',
      time: '15:00:00',
    });
    await sq.query(`INSERT INTO receipt_payment_details VALUES (NULL,?,'PAYMENT','دفع نقدي',?,?,150.0000)`, {
      replacements: [movId, c['C011'], cur['USD']],
    });
    await insertEntry({
      movId,
      clientId: c['C011'],
      currCode: 'USD',
      amount: '150.0000',
      side: 'THEM',
      description: 'دفع نقدي لبشير القاسم',
      date: '2026-08-20',
      time: '15:00:00',
    });

    // P-002: دفع 3,200,000 ليرة لشركة النور
    movId = await insertMovement({
      no: 1012,
      typeCode: 'PAYMENT',
      clientId: c['C005'],
      description: 'دفع ليرات - شركة النور',
      date: '2026-08-24',
      time: '12:00:00',
    });
    await sq.query(`INSERT INTO receipt_payment_details VALUES (NULL,?,'PAYMENT',NULL,?,?,3200000.0000)`, {
      replacements: [movId, c['C005'], cur['SYP']],
    });
    await insertEntry({
      movId,
      clientId: c['C005'],
      currCode: 'SYP',
      amount: '3200000.0000',
      side: 'THEM',
      description: 'دفع ليرات لشركة النور للتجارة',
      date: '2026-08-24',
      time: '12:00:00',
    });

    // P-003: دفع 600 دولار لمحمود
    movId = await insertMovement({
      no: 1013,
      typeCode: 'PAYMENT',
      clientId: c['C003'],
      description: 'دفع دولار - محمود دبي',
      date: '2026-09-01',
      time: '14:45:00',
    });
    await sq.query(`INSERT INTO receipt_payment_details VALUES (NULL,?,'PAYMENT','دفع دولار',?,?,600.0000)`, {
      replacements: [movId, c['C003'], cur['USD']],
    });
    await insertEntry({
      movId,
      clientId: c['C003'],
      currCode: 'USD',
      amount: '600.0000',
      side: 'THEM',
      description: 'دفع دولار لمحمود الحسين - دبي',
      date: '2026-09-01',
      time: '14:45:00',
    });

    // ── تصريف (EXCHANGE) ──────────────────────────────────────
    // E-001: رامي يصرّف 200 دولار بليرة سورية
    movId = await insertMovement({
      no: 1014,
      typeCode: 'EXCHANGE',
      clientId: c['C012'],
      description: 'تصريف دولار - ليرة سورية',
      date: '2026-08-23',
      time: '10:00:00',
      totalResult: '3.00',
    });
    await sq.query(
      `INSERT INTO exchange_details VALUES (NULL,?,?,?,200.0000,?,2700000.0000,13500.00000000,200.0000,2700000.0000,3.0000)`,
      { replacements: [movId, c['C012'], cur['USD'], cur['SYP']] },
    );
    await insertEntry({
      movId,
      clientId: c['C012'],
      currCode: 'USD',
      amount: '200.0000',
      side: 'US',
      exchangeRate: '13500.00000000',
      description: 'بيع دولار - رامي',
      date: '2026-08-23',
      time: '10:00:00',
    });
    await insertEntry({
      movId,
      clientId: c['C012'],
      currCode: 'SYP',
      amount: '2700000.0000',
      side: 'THEM',
      exchangeRate: '13500.00000000',
      description: 'شراء ليرة - رامي',
      date: '2026-08-23',
      time: '10:00:00',
    });

    // E-002: خالد يصرّف 1500 ريال بدولار
    movId = await insertMovement({
      no: 1015,
      typeCode: 'EXCHANGE',
      clientId: c['C007'],
      description: 'تصريف ريال - دولار',
      date: '2026-08-27',
      time: '11:30:00',
      totalResult: '2.50',
    });
    await sq.query(
      `INSERT INTO exchange_details VALUES (NULL,?,?,?,1500.0000,?,400.0000,3.75000000,1500.0000,400.0000,2.5000)`,
      { replacements: [movId, c['C007'], cur['SAR'], cur['USD']] },
    );
    await insertEntry({
      movId,
      clientId: c['C007'],
      currCode: 'SAR',
      amount: '1500.0000',
      side: 'US',
      exchangeRate: '3.75000000',
      description: 'بيع ريال - خالد',
      date: '2026-08-27',
      time: '11:30:00',
    });
    await insertEntry({
      movId,
      clientId: c['C007'],
      currCode: 'USD',
      amount: '400.0000',
      side: 'THEM',
      exchangeRate: '3.75000000',
      description: 'شراء دولار - خالد',
      date: '2026-08-27',
      time: '11:30:00',
    });

    // E-003: سمر تصرّف ليرة تركية بدولار
    movId = await insertMovement({
      no: 1016,
      typeCode: 'EXCHANGE',
      clientId: c['C010'],
      description: 'تصريف ليرة تركية - دولار',
      date: '2026-09-02',
      time: '09:00:00',
      totalResult: '1.80',
    });
    await sq.query(
      `INSERT INTO exchange_details VALUES (NULL,?,?,?,3250.0000,?,100.0000,32.50000000,3250.0000,100.0000,1.8000)`,
      { replacements: [movId, c['C010'], cur['TRY'], cur['USD']] },
    );
    await insertEntry({
      movId,
      clientId: c['C010'],
      currCode: 'TRY',
      amount: '3250.0000',
      side: 'US',
      exchangeRate: '32.50000000',
      description: 'بيع ليرة تركية - سمر',
      date: '2026-09-02',
      time: '09:00:00',
    });
    await insertEntry({
      movId,
      clientId: c['C010'],
      currCode: 'USD',
      amount: '100.0000',
      side: 'THEM',
      exchangeRate: '32.50000000',
      description: 'شراء دولار - سمر',
      date: '2026-09-02',
      time: '09:00:00',
    });

    // ── تسوية (SETTLEMENT) ────────────────────────────────────
    // S-001: تسوية بين أحمد وسمر
    movId = await insertMovement({
      no: 1017,
      typeCode: 'SETTLEMENT',
      clientId: c['C001'],
      description: 'تسوية حساب أغسطس',
      date: '2026-08-31',
      time: '17:00:00',
    });
    await insertEntry({
      movId,
      clientId: c['C001'],
      currCode: 'USD',
      amount: '100.0000',
      side: 'US',
      description: 'تسوية لصالح أحمد السعيد',
      date: '2026-08-31',
      time: '17:00:00',
    });
    await insertEntry({
      movId,
      clientId: c['C010'],
      currCode: 'USD',
      amount: '100.0000',
      side: 'THEM',
      description: 'تسوية على سمر الدريس',
      date: '2026-08-31',
      time: '17:00:00',
    });

    // S-002: تسوية شركة النور
    movId = await insertMovement({
      no: 1018,
      typeCode: 'SETTLEMENT',
      clientId: c['C005'],
      description: 'تسوية شهرية - شركة النور',
      date: '2026-09-01',
      time: '16:00:00',
    });
    await insertEntry({
      movId,
      clientId: c['C005'],
      currCode: 'USD',
      amount: '250.0000',
      side: 'US',
      description: 'رصيد مستحق لشركة النور',
      date: '2026-09-01',
      time: '16:00:00',
    });
    await insertEntry({
      movId,
      clientId: c['C006'],
      currCode: 'USD',
      amount: '250.0000',
      side: 'THEM',
      description: 'مطلوب من مؤسسة الأمانة',
      date: '2026-09-01',
      time: '16:00:00',
    });

    console.log('✅ Demo data seeded successfully');
    console.log(`   - 4 client groups`);
    console.log(`   - 12 clients`);
    console.log(`   - 18 movements (6 transfers, 4 receipts, 3 payments, 3 exchanges, 2 settlements)`);
  },

  async down(queryInterface) {
    const sq = queryInterface.sequelize;
    // حذف بالترتيب العكسي (الأبناء قبل الآباء)
    await sq.query(
      `DELETE FROM journal_entries WHERE movement_id IN (SELECT id_movement FROM movements WHERE movement_no BETWEEN 1001 AND 1018)`,
    );
    await sq.query(
      `DELETE FROM transfer_details WHERE movement_id IN (SELECT id_movement FROM movements WHERE movement_no BETWEEN 1001 AND 1018)`,
    );
    await sq.query(
      `DELETE FROM receipt_payment_details WHERE movement_id IN (SELECT id_movement FROM movements WHERE movement_no BETWEEN 1001 AND 1018)`,
    );
    await sq.query(
      `DELETE FROM exchange_details WHERE movement_id IN (SELECT id_movement FROM movements WHERE movement_no BETWEEN 1001 AND 1018)`,
    );
    await sq.query(`DELETE FROM movements WHERE movement_no BETWEEN 1001 AND 1018`);
    await sq.query(`DELETE FROM clients WHERE client_code BETWEEN 'C001' AND 'C012'`);
    await queryInterface.bulkDelete('client_groups', {
      group_name: ['مغتربون سوريون', 'شركات ومؤسسات', 'عملاء VIP', 'عملاء عاديون'],
    });
  },
};
