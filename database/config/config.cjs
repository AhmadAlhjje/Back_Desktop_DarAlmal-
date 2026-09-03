require('dotenv').config();

const shared = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  migrationStorageTableName: 'SequelizeMeta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
};

module.exports = {
  development: shared,
  test: { ...shared, database: process.env.DB_TEST_NAME || `${process.env.DB_NAME}_test` },
  production: shared,
};
