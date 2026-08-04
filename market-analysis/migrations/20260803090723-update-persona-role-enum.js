
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the old enum type and create a new one with updated values
    await queryInterface.sequelize.query(`
      ALTER TABLE personas
      ALTER COLUMN primary_focus_role TYPE VARCHAR(50);
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_personas_primary_focus_role";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_personas_primary_focus_role" AS ENUM (
        'COMPETITIVE_ANALYST',
        'MARKET_RESEARCHER',
        'CUSTOMER_SUCCESS_EXPERT',
        'BUSINESS_STRATEGIST',
        'GENERAL_ASSISTANT',
        'SALES',
        'MARKETING',
        'PRODUCT',
        'ENGINEERING',
        'FINANCE',
        'OPERATIONS',
        'HR'
      );
    `);

    // Update existing values to new enum values
    await queryInterface.sequelize.query(`
      UPDATE personas
      SET primary_focus_role = UPPER(primary_focus_role);
    `);

    await queryInterface.sequelize.query(`
      UPDATE personas
      SET primary_focus_role = 'GENERAL_ASSISTANT'
      WHERE primary_focus_role = 'GENERAL';
    `);

    await queryInterface.sequelize.query(`
      UPDATE personas
      SET primary_focus_role = 'CUSTOMER_SUCCESS_EXPERT'
      WHERE primary_focus_role = 'CUSTOMER_SUPPORT';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE personas
      ALTER COLUMN primary_focus_role TYPE "enum_personas_primary_focus_role"
      USING primary_focus_role::"enum_personas_primary_focus_role";
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert to old enum values
    await queryInterface.sequelize.query(`
      ALTER TABLE personas
      ALTER COLUMN primary_focus_role TYPE VARCHAR(50);
    `);

    await queryInterface.sequelize.query(`
      UPDATE personas
      SET primary_focus_role = LOWER(primary_focus_role);
    `);

    await queryInterface.sequelize.query(`
      UPDATE personas
      SET primary_focus_role = 'general'
      WHERE primary_focus_role = 'general_assistant';
    `);

    await queryInterface.sequelize.query(`
      UPDATE personas
      SET primary_focus_role = 'customer_support'
      WHERE primary_focus_role = 'customer_success_expert';
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_personas_primary_focus_role";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_personas_primary_focus_role" AS ENUM (
        'sales',
        'marketing',
        'customer_support',
        'product',
        'engineering',
        'finance',
        'operations',
        'hr',
        'general'
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE personas
      ALTER COLUMN primary_focus_role TYPE "enum_personas_primary_focus_role"
      USING primary_focus_role::"enum_personas_primary_focus_role";
    `);
  }
};
