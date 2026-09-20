import { Sequelize } from 'sequelize-typescript';
import { env } from '../../../config/env.js';
import { configureAssociations } from './associations.js';
import * as models from './models/index.js';
import { installTenancyHooks } from './tenancy-hooks.js';

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  models: Object.values(models),
  logging: env.DB_LOGGING === 'true' ? console.debug : false,
  // Keep every BIGINT as a string (ids are compared as strings across the app).
  dialectOptions: { supportBigNumbers: true, bigNumberStrings: true, decimalNumbers: false },
  define: { freezeTableName: true, underscored: true },
});
configureAssociations();
// عزل المكاتب: كل استعلام على جدول تجاري يُقيَّد بمكتب الطلب تلقائياً.
installTenancyHooks(sequelize);
