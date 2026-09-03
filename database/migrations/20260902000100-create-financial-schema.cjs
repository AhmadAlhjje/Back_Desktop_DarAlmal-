'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const uBigInt = { type: Sequelize.BIGINT.UNSIGNED };
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const pk = () => ({ ...uBigInt, allowNull: false, primaryKey: true, autoIncrement: true });
    const fk = (table, field) => ({
      ...uBigInt,
      references: { model: table, key: field },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.createTable(
      'admins',
      {
        id_admin: pk(),
        full_name: { type: Sequelize.STRING(150), allowNull: false },
        username: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        phone: { type: Sequelize.STRING(30), allowNull: true },
        email: { type: Sequelize.STRING(150), allowNull: true, unique: true },
        password_hash: { type: Sequelize.STRING(255), allowNull: false },
        role: { type: Sequelize.ENUM('ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE', 'VIEWER'), allowNull: false },
        permissions: { type: Sequelize.JSON, allowNull: true },
        is_developer: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    await queryInterface.createTable(
      'client_groups',
      {
        id_group: pk(),
        group_name: { type: Sequelize.STRING(150), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    await queryInterface.createTable(
      'clients',
      {
        id_client: pk(),
        client_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        group_id: { ...fk('client_groups', 'id_group'), allowNull: true },
        full_name: { type: Sequelize.STRING(200), allowNull: false },
        phone: { type: Sequelize.STRING(30), allowNull: true },
        email: { type: Sequelize.STRING(150), allowNull: true },
        address: { type: Sequelize.TEXT, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    await queryInterface.createTable(
      'currencies',
      {
        id_currency: pk(),
        currency_name: { type: Sequelize.STRING(100), allowNull: false },
        currency_code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
        currency_symbol: { type: Sequelize.STRING(20), allowNull: true },
        decimal_places: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 2 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    await queryInterface.createTable(
      'movement_types',
      {
        id_movement_type: pk(),
        movement_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        movement_name: { type: Sequelize.STRING(100), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    await queryInterface.createTable(
      'movements',
      {
        id_movement: pk(),
        movement_no: { ...uBigInt, allowNull: false, unique: true },
        movement_type_id: { ...fk('movement_types', 'id_movement_type'), allowNull: false },
        client_id: { ...fk('clients', 'id_client'), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        movement_date: { type: Sequelize.DATEONLY, allowNull: false },
        movement_time: { type: Sequelize.TIME, allowNull: false },
        total_result: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        status: {
          type: Sequelize.ENUM('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED'),
          allowNull: false,
          defaultValue: 'POSTED',
        },
        created_by: { ...fk('admins', 'id_admin'), allowNull: false },
        ...timestamps,
        updated_by: { ...fk('admins', 'id_admin'), allowNull: true },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    await queryInterface.createTable(
      'journal_entries',
      {
        id_day: pk(),
        movement_id: { ...fk('movements', 'id_movement'), allowNull: false },
        line_no: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        client_id: { ...fk('clients', 'id_client'), allowNull: false },
        currency_id: { ...fk('currencies', 'id_currency'), allowNull: false },
        amount: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        entry_side: { type: Sequelize.ENUM('US', 'THEM'), allowNull: false },
        exchange_rate: { type: Sequelize.DECIMAL(20, 8), allowNull: true },
        fees: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        fee_percentage: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        movement_date: { type: Sequelize.DATEONLY, allowNull: false },
        movement_time: { type: Sequelize.TIME, allowNull: false },
        ...timestamps,
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );
    await queryInterface.addConstraint('journal_entries', {
      fields: ['amount'],
      type: 'check',
      where: { amount: { [Sequelize.Op.gt]: 0 } },
      name: 'chk_journal_entries_amount_positive',
    });

    await queryInterface.createTable(
      'transfer_details',
      {
        id_transfer: pk(),
        movement_id: { ...fk('movements', 'id_movement'), allowNull: false, unique: true },
        statement: { type: Sequelize.TEXT, allowNull: true },
        transfer_amount: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        transfer_currency_id: { ...fk('currencies', 'id_currency'), allowNull: false },
        from_client_id: { ...fk('clients', 'id_client'), allowNull: false },
        from_currency_id: { ...fk('currencies', 'id_currency'), allowNull: false },
        from_exchange_rate: { type: Sequelize.DECIMAL(20, 8), allowNull: false },
        fee_us: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        fee_us_percentage: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
        total_us: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        description_us: { type: Sequelize.TEXT, allowNull: true },
        to_client_id: { ...fk('clients', 'id_client'), allowNull: false },
        to_currency_id: { ...fk('currencies', 'id_currency'), allowNull: false },
        to_exchange_rate: { type: Sequelize.DECIMAL(20, 8), allowNull: false },
        fee_them: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        fee_them_percentage: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
        total_them: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        description_them: { type: Sequelize.TEXT, allowNull: true },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    await queryInterface.createTable(
      'exchange_details',
      {
        id_exchange: pk(),
        movement_id: { ...fk('movements', 'id_movement'), allowNull: false, unique: true },
        client_id: { ...fk('clients', 'id_client'), allowNull: false },
        from_currency_id: { ...fk('currencies', 'id_currency'), allowNull: false },
        from_amount: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        to_currency_id: { ...fk('currencies', 'id_currency'), allowNull: false },
        to_amount: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        exchange_rate: { type: Sequelize.DECIMAL(20, 8), allowNull: false },
        total_us: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        total_them: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        profit_loss: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    await queryInterface.createTable(
      'receipt_payment_details',
      {
        id: pk(),
        movement_id: { ...fk('movements', 'id_movement'), allowNull: false, unique: true },
        transaction_type: { type: Sequelize.ENUM('RECEIPT', 'PAYMENT'), allowNull: false },
        statement: { type: Sequelize.TEXT, allowNull: true },
        client_id: { ...fk('clients', 'id_client'), allowNull: false },
        currency_id: { ...fk('currencies', 'id_currency'), allowNull: false },
        amount: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    await queryInterface.createTable(
      'notifications',
      {
        id_notification: pk(),
        admin_id: { ...fk('admins', 'id_admin'), allowNull: false },
        title: { type: Sequelize.STRING(200), allowNull: false },
        message: { type: Sequelize.TEXT, allowNull: false },
        notification_type: { type: Sequelize.STRING(50), allowNull: true },
        movement_id: { ...fk('movements', 'id_movement'), allowNull: true },
        is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        ...timestamps,
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    const indexes = [
      ['movements', ['movement_date']],
      ['movements', ['movement_type_id']],
      ['movements', ['client_id']],
      ['movements', ['created_by']],
      ['movements', ['status']],
      ['journal_entries', ['movement_id', 'line_no'], { unique: true, name: 'uq_journal_movement_line' }],
      ['journal_entries', ['client_id']],
      ['journal_entries', ['currency_id']],
      ['journal_entries', ['client_id', 'currency_id', 'movement_date'], { name: 'idx_journal_client_currency_date' }],
      ['journal_entries', ['movement_date', 'movement_id'], { name: 'idx_journal_date_movement' }],
      ['transfer_details', ['from_client_id']],
      ['transfer_details', ['to_client_id']],
    ];
    for (const [table, fields, options = {}] of indexes) await queryInterface.addIndex(table, fields, options);
  },

  async down(queryInterface) {
    for (const table of [
      'notifications',
      'receipt_payment_details',
      'exchange_details',
      'transfer_details',
      'journal_entries',
      'movements',
      'movement_types',
      'currencies',
      'clients',
      'client_groups',
      'admins',
    ]) {
      await queryInterface.dropTable(table);
    }
  },
};
