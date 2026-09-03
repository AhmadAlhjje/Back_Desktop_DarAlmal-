import { Sequelize } from 'sequelize-typescript';
import { env } from '../../../config/env.js';
import { configureAssociations } from './associations.js';
import * as models from './models/index.js';

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  models: Object.values(models),
  logging: env.DB_LOGGING === 'true' ? console.debug : false,
  define: { freezeTableName: true, underscored: true },
});
configureAssociations();
