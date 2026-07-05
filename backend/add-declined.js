import pool from './src/db/pool.js';

try {
  await pool.query(`
    ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;
    ALTER TABLE requests ADD CONSTRAINT requests_status_check 
      CHECK (status IN ('draft', 'reviewed', 'approved', 'declined', 'closed'));
  `);
  console.log('✅ Status constraint updated — declined status added');
  process.exit(0);
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
