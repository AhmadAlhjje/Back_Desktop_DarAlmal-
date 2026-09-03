'use strict';
const bcrypt = require('bcrypt');
module.exports = {
  async up(queryInterface) {
    const { INITIAL_ADMIN_NAME: full_name, INITIAL_ADMIN_EMAIL: email, INITIAL_ADMIN_PASSWORD: password } = process.env;
    if (!full_name || !password) return;
    const password_hash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
    await queryInterface.bulkInsert('admins', [
      {
        full_name,
        email: email || null,
        password_hash,
        role: 'ADMIN',
        permissions: JSON.stringify([
          'admin.manage',
          'currency.manage',
          'client.create',
          'client.update',
          'movement.create',
          'movement.view',
          'movement.cancel',
          'movement.reverse',
          'journal.view',
        ]),
        is_developer: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  async down(queryInterface) {
    if (process.env.INITIAL_ADMIN_NAME)
      await queryInterface.bulkDelete('admins', { full_name: process.env.INITIAL_ADMIN_NAME });
  },
};
