import pool from './pool.js';

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor', 'user')),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sla_rules (
        id SERIAL PRIMARY KEY,
        priority VARCHAR(20) UNIQUE NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
        days INTEGER NOT NULL,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(20) UNIQUE NOT NULL,
        requestor_name VARCHAR(255) NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'issue', 'information', 'change', 'other')),
        source_channel VARCHAR(50) NOT NULL CHECK (source_channel IN ('email', 'portal', 'chat')),
        priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
        raw_description TEXT NOT NULL,
        ai_summary TEXT,
        ai_details TEXT,
        ai_next_action TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'declined', 'closed')),
        due_date TIMESTAMP,
        assigned_supervisor INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        tag_name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS request_tags (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(request_id, tag_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id),
        action_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        action VARCHAR(500) NOT NULL,
        performed_by INTEGER REFERENCES users(id),
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert default tags
    await client.query(`
      INSERT INTO tags (tag_name)
      VALUES ('Access'), ('Urgent'), ('Dependency'), ('Follow-up'), ('Security'), ('Infrastructure'), ('Software'), ('Hardware'), ('Network'), ('Policy')
      ON CONFLICT (tag_name) DO NOTHING;
    `);

    // Insert default SLA rules
    await client.query(`
      INSERT INTO sla_rules (priority, days)
      VALUES ('low', 5), ('medium', 3), ('high', 1)
      ON CONFLICT (priority) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
