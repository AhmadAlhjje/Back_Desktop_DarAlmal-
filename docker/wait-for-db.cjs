'use strict';
// ينتظر قاعدة البيانات حتى تقبل الاتصال (حاوية MariaDB تحتاج ثوانيَ للتهيئة عند أول تشغيل).
// يقرأ DB_* من البيئة نفسها التي يقرأها الخادم. لا يطبع كلمة المرور.
const mysql = require('mysql2/promise');

const attempts = Number(process.env.DB_WAIT_ATTEMPTS || 60);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS || 2000);
const target = `${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`;

async function main() {
  for (let i = 1; i <= attempts; i++) {
    try {
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 3000,
      });
      await conn.query('SELECT 1');
      await conn.end();
      console.info(`[db] ready: ${target}`);
      return;
    } catch (error) {
      console.info(`[db] waiting (${i}/${attempts}) ${target}: ${error.code || error.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error(`[db] not reachable after ${attempts} attempts: ${target}`);
  process.exit(1);
}

main();
