'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const fk = (table, field, allowNull = false) => ({
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull,
      references: { model: table, key: field },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    const pk = { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false };
    const opts = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };

    await queryInterface.addIndex('admins', ['full_name'], { unique: true, name: 'uq_admins_full_name' });
    await queryInterface.removeColumn('admins', 'username');
    await queryInterface.removeColumn('client_groups', 'is_active');
    await queryInterface.addColumn('clients', 'importance', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addConstraint('clients', {
      fields: ['importance'],
      type: 'check',
      where: { importance: { [Sequelize.Op.between]: [0, 100000] } },
      name: 'chk_clients_importance',
    });
    await queryInterface.addIndex('clients', ['importance', 'full_name'], { name: 'idx_clients_importance_name' });
    await queryInterface.removeColumn('clients', 'notes');
    await queryInterface.removeColumn('clients', 'is_active');

    await queryInterface.addColumn('currencies', 'icon_path', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn('currencies', 'text_icon', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('currencies', 'importance', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('currencies', 'exchange_rate', {
      type: Sequelize.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: '1.00000000',
    });
    await queryInterface.addColumn('currencies', 'exchange_type', {
      type: Sequelize.ENUM('FROM_USD_MULTIPLY', 'TO_USD_DIVIDE'),
      allowNull: false,
      defaultValue: 'FROM_USD_MULTIPLY',
    });
    await queryInterface.addConstraint('currencies', {
      fields: ['importance'],
      type: 'check',
      where: { importance: { [Sequelize.Op.between]: [0, 100000] } },
      name: 'chk_currencies_importance',
    });
    await queryInterface.addConstraint('currencies', {
      fields: ['exchange_rate'],
      type: 'check',
      where: { exchange_rate: { [Sequelize.Op.gt]: 0 } },
      name: 'chk_currencies_exchange_rate',
    });
    await queryInterface.addIndex('currencies', ['importance', 'currency_code'], {
      name: 'idx_currencies_importance_code',
    });

    await queryInterface.createTable(
      'settlement_movements',
      {
        id_settlement: pk,
        movement_id: { ...fk('movements', 'id_movement'), unique: true },
        statement: { type: Sequelize.TEXT, allowNull: true },
        first_client_id: fk('clients', 'id_client'),
        second_client_id: fk('clients', 'id_client', true),
        first_currency_id: fk('currencies', 'id_currency'),
        second_currency_id: fk('currencies', 'id_currency', true),
        first_amount: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        second_amount: { type: Sequelize.DECIMAL(20, 4), allowNull: true },
        movement_kind: { type: Sequelize.ENUM('SETTLEMENT', 'ACCREDITATION', 'RECEIPT', 'PAYMENT'), allowNull: false },
        movement_system: { type: Sequelize.ENUM('SETTLEMENT', 'ACCREDITATION'), allowNull: true },
      },
      opts,
    );
    await queryInterface.createTable(
      'transfer_movements',
      {
        id_transfer: pk,
        movement_id: { ...fk('movements', 'id_movement'), unique: true },
        statement: { type: Sequelize.TEXT, allowNull: true },
        transfer_amount: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        transfer_currency_id: fk('currencies', 'id_currency'),
        first_client_id: fk('clients', 'id_client'),
        second_client_id: fk('clients', 'id_client'),
        first_currency_id: fk('currencies', 'id_currency'),
        second_currency_id: fk('currencies', 'id_currency'),
        first_exchange_rate: { type: Sequelize.DECIMAL(20, 8), allowNull: false },
        second_exchange_rate: { type: Sequelize.DECIMAL(20, 8), allowNull: false },
        fee_us: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        fee_them: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        fee_us_percentage: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
        fee_them_percentage: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
        total_us: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        total_them: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
        description_us: { type: Sequelize.TEXT, allowNull: true },
        description_them: { type: Sequelize.TEXT, allowNull: true },
      },
      opts,
    );
    await queryInterface.createTable(
      'multi_movements',
      {
        id_multi: pk,
        movement_id: fk('movements', 'id_movement'),
        statement: { type: Sequelize.TEXT, allowNull: true },
        party_side: { type: Sequelize.ENUM('DEBIT_US', 'CREDIT_US'), allowNull: false },
        client_id: fk('clients', 'id_client'),
        currency_id: fk('currencies', 'id_currency'),
        amount: { type: Sequelize.DECIMAL(20, 4), allowNull: false },
      },
      opts,
    );
    await queryInterface.createTable(
      'exchange_movements',
      {
        id_exchange: pk,
        movement_id: { ...fk('movements', 'id_movement'), unique: true },
        statement: { type: Sequelize.TEXT, allowNull: true },
        first_client_id: fk('clients', 'id_client'),
        second_client_id: fk('clients', 'id_client', true),
        exchange_rate: { type: Sequelize.DECIMAL(20, 8), allowNull: false },
        first_currency_id: fk('currencies', 'id_currency'),
        second_currency_id: fk('currencies', 'id_currency'),
        total_us: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        total_them: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
        result: { type: Sequelize.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' },
      },
      opts,
    );

    for (const [table, fields] of [
      ['settlement_movements', ['first_client_id']],
      ['settlement_movements', ['second_client_id']],
      ['settlement_movements', ['first_currency_id']],
      ['settlement_movements', ['second_currency_id']],
      ['transfer_movements', ['first_client_id']],
      ['transfer_movements', ['second_client_id']],
      ['multi_movements', ['movement_id']],
      ['multi_movements', ['client_id', 'currency_id']],
      ['exchange_movements', ['first_client_id']],
      ['exchange_movements', ['second_client_id']],
    ])
      await queryInterface.addIndex(table, fields);

    await queryInterface.sequelize.query(
      `INSERT INTO transfer_movements (movement_id,statement,transfer_amount,transfer_currency_id,first_client_id,second_client_id,first_currency_id,second_currency_id,first_exchange_rate,second_exchange_rate,fee_us,fee_them,fee_us_percentage,fee_them_percentage,total_us,total_them,description_us,description_them) SELECT movement_id,statement,transfer_amount,transfer_currency_id,from_client_id,to_client_id,from_currency_id,to_currency_id,from_exchange_rate,to_exchange_rate,fee_us,fee_them,fee_us_percentage,fee_them_percentage,total_us,total_them,description_us,description_them FROM transfer_details`,
    );
    await queryInterface.sequelize.query(
      `INSERT INTO exchange_movements (movement_id,statement,first_client_id,second_client_id,exchange_rate,first_currency_id,second_currency_id,total_us,total_them,result) SELECT e.movement_id,m.description,e.client_id,NULL,e.exchange_rate,e.from_currency_id,e.to_currency_id,e.total_us,e.total_them,e.profit_loss FROM exchange_details e JOIN movements m ON m.id_movement=e.movement_id`,
    );
    await queryInterface.sequelize.query(
      `INSERT INTO settlement_movements (movement_id,statement,first_client_id,second_client_id,first_currency_id,second_currency_id,first_amount,second_amount,movement_kind,movement_system) SELECT r.movement_id,COALESCE(r.statement,m.description),r.client_id,NULL,r.currency_id,NULL,r.amount,NULL,r.transaction_type,'SETTLEMENT' FROM receipt_payment_details r JOIN movements m ON m.id_movement=r.movement_id`,
    );
    await queryInterface.sequelize.query(
      `INSERT INTO settlement_movements (movement_id,statement,first_client_id,second_client_id,first_currency_id,second_currency_id,first_amount,second_amount,movement_kind,movement_system) SELECT m.id_movement,m.description,MIN(CASE WHEN j.rn=1 THEN j.client_id END),MIN(CASE WHEN j.rn=2 THEN j.client_id END),MIN(CASE WHEN j.rn=1 THEN j.currency_id END),MIN(CASE WHEN j.rn=2 THEN j.currency_id END),MIN(CASE WHEN j.rn=1 THEN j.amount END),MIN(CASE WHEN j.rn=2 THEN j.amount END),'SETTLEMENT',NULL FROM movements m JOIN movement_types mt ON mt.id_movement_type=m.movement_type_id JOIN (SELECT je.*,ROW_NUMBER() OVER(PARTITION BY movement_id ORDER BY line_no,id_day) rn FROM journal_entries je) j ON j.movement_id=m.id_movement WHERE mt.movement_code='SETTLEMENT' GROUP BY m.id_movement,m.description`,
    );

    await queryInterface.sequelize.query(`UPDATE movements SET created_at=TIMESTAMP(movement_date,movement_time)`);
    await queryInterface.addColumn('journal_entries', 'amount_us', {
      type: Sequelize.DECIMAL(20, 4),
      allowNull: false,
      defaultValue: '0.0000',
    });
    await queryInterface.addColumn('journal_entries', 'amount_them', {
      type: Sequelize.DECIMAL(20, 4),
      allowNull: false,
      defaultValue: '0.0000',
    });
    await queryInterface.sequelize.query(
      `UPDATE journal_entries SET amount_us=CASE WHEN entry_side='US' THEN amount ELSE 0 END, amount_them=CASE WHEN entry_side='THEM' THEN amount ELSE 0 END`,
    );
    await queryInterface.sequelize.query(`
      UPDATE journal_entries j
      JOIN movements m ON m.id_movement=j.movement_id
      JOIN movement_types mt ON mt.id_movement_type=m.movement_type_id
      SET j.amount_us=CASE WHEN mt.movement_code='PAYMENT' THEN j.amount ELSE 0 END,
          j.amount_them=CASE WHEN mt.movement_code='RECEIPT' THEN j.amount ELSE 0 END
      WHERE mt.movement_code IN ('RECEIPT','PAYMENT')
    `);
    await queryInterface.sequelize.query(`
      UPDATE journal_entries j
      JOIN exchange_details e ON e.movement_id=j.movement_id
      SET j.amount_us=CASE WHEN j.currency_id=e.to_currency_id THEN j.amount ELSE 0 END,
          j.amount_them=CASE WHEN j.currency_id=e.from_currency_id THEN j.amount ELSE 0 END
    `);
    await queryInterface.sequelize.query(`
      UPDATE journal_entries j
      JOIN transfer_details t ON t.movement_id=j.movement_id
      SET j.amount_us=CASE WHEN j.client_id=t.to_client_id AND j.currency_id=t.to_currency_id THEN j.amount ELSE 0 END,
          j.amount_them=CASE WHEN j.client_id=t.from_client_id AND j.currency_id=t.from_currency_id THEN j.amount ELSE 0 END
    `);
    await queryInterface.addIndex('journal_entries', ['movement_id'], { name: 'idx_journal_movement_fk' });
    await queryInterface.removeIndex('journal_entries', 'uq_journal_movement_line');
    await queryInterface.sequelize.query(
      'ALTER TABLE journal_entries DROP CONSTRAINT chk_journal_entries_amount_positive',
    );
    await queryInterface.removeIndex('journal_entries', 'idx_journal_client_currency_date');
    await queryInterface.removeIndex('journal_entries', 'idx_journal_date_movement');
    for (const column of [
      'line_no',
      'amount',
      'entry_side',
      'exchange_rate',
      'fees',
      'fee_percentage',
      'movement_date',
    ])
      await queryInterface.removeColumn('journal_entries', column);
    await queryInterface.addConstraint('journal_entries', {
      fields: ['amount_us', 'amount_them'],
      type: 'check',
      where: {
        [Sequelize.Op.or]: [
          { amount_us: { [Sequelize.Op.gt]: 0 }, amount_them: 0 },
          { amount_us: 0, amount_them: { [Sequelize.Op.gt]: 0 } },
        ],
      },
      name: 'chk_journal_single_side',
    });
    await queryInterface.addIndex('journal_entries', ['movement_id', 'id_day'], { name: 'idx_journal_movement_order' });
    await queryInterface.addIndex('journal_entries', ['client_id', 'currency_id'], {
      name: 'idx_journal_client_currency',
    });

    await queryInterface.dropTable('transfer_details');
    await queryInterface.dropTable('exchange_details');
    await queryInterface.dropTable('receipt_payment_details');
    await queryInterface.removeColumn('movements', 'description');
    await queryInterface.removeColumn('movements', 'movement_date');
  },

  async down() {
    throw new Error('Irreversible after financial data migration; restore from backup instead.');
  },
};
