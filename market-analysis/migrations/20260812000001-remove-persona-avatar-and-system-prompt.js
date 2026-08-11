'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('personas', 'avatar_url', {
        transaction,
      });
      await queryInterface.removeColumn('personas', 'system_prompt', {
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'personas',
        'avatar_url',
        {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.addColumn(
        'personas',
        'system_prompt',
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction },
      );
    });
  },
};
