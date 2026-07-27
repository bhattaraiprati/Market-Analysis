/**
 * Migration Script: Add AnalystAgent columns to research_jobs table
 * Run this once: node migrate-analyst-columns.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

async function migrate() {
  console.log('🔧 Starting database migration...\n');

  // Create Sequelize instance from your .env
  const sequelize = new Sequelize(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'market_analysis',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: false,
  });

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Check if columns already exist
    const [results] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'research_jobs'
        AND column_name IN ('output_results', 'analyzed_at')
    `);

    const existingColumns = results.map(r => r.column_name);
    console.log('📊 Existing columns:', existingColumns.length > 0 ? existingColumns.join(', ') : 'none');

    // Add output_results column
    if (!existingColumns.includes('output_results')) {
      console.log('➕ Adding output_results column...');
      await sequelize.query(`
        ALTER TABLE research_jobs
        ADD COLUMN output_results JSONB;
      `);
      console.log('✅ Added output_results column');
    } else {
      console.log('⏭️  output_results column already exists');
    }

    // Add analyzed_at column
    if (!existingColumns.includes('analyzed_at')) {
      console.log('➕ Adding analyzed_at column...');
      await sequelize.query(`
        ALTER TABLE research_jobs
        ADD COLUMN analyzed_at TIMESTAMP WITH TIME ZONE;
      `);
      console.log('✅ Added analyzed_at column');
    } else {
      console.log('⏭️  analyzed_at column already exists');
    }

    // Create index for better performance
    console.log('➕ Creating index...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_research_jobs_analyzed_at
      ON research_jobs(analyzed_at);
    `);
    console.log('✅ Index created');

    // Verify columns were added
    console.log('\n📋 Verifying columns...');
    const [verification] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'research_jobs'
        AND column_name IN ('output_results', 'analyzed_at')
      ORDER BY column_name
    `);

    console.log('\n✅ Migration complete! Columns added:');
    verification.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n🎉 Database is ready! You can now restart your server.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migration
migrate();
