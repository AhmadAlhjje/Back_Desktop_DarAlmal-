'use strict';

/** الإشعار يحمل منفّذ العملية (معتمد 2026-09-14): actor_id + actor_name (الاسم محفوظ حتى لو عُطّل الإداري). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('notifications', 'actor_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      after: 'is_read',
    });
    await queryInterface.addColumn('notifications', 'actor_name', {
      type: Sequelize.STRING(200),
      allowNull: true,
      after: 'actor_id',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('notifications', 'actor_name');
    await queryInterface.removeColumn('notifications', 'actor_id');
  },
};
