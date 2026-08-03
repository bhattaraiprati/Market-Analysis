'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'conversations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      role: {
        type: Sequelize.ENUM('user', 'assistant', 'system'),
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'completed',
      },
      intent_analysis: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      sources_used: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      prompt_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      completion_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      total_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      processing_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      model_used: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('messages', ['conversation_id']);
    await queryInterface.addIndex('messages', ['user_id']);
    await queryInterface.addIndex('messages', ['role']);
    await queryInterface.addIndex('messages', ['status']);
    await queryInterface.addIndex('messages', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('messages');
  },
};
