import bcrypt from 'bcryptjs';
import pool from './pool.js';

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adminHash = await bcrypt.hash('admin123', 10);
    const superHash = await bcrypt.hash('super123', 10);
    const userHash = await bcrypt.hash('user123', 10);

    // Admin
    await client.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
      ['System Admin', 'admin@company.com', adminHash, 'admin']
    );

    // Supervisors
    const supervisors = [
      ['Alice Johnson', 'smartasundar@gmail.com'],
      ['Bob Williams', 'supervisor2@company.com'],
      ['Carol Davis', 'supervisor3@company.com'],
    ];
    for (const [name, email] of supervisors) {
      await client.query(
        `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
        [name, email, superHash, 'supervisor']
      );
    }

    // Users
    const users = [
      ['David Brown', 'aishwaryadharmar9@gmail.com'],
      ['Eva Martinez', 'user2@company.com'],
      ['Frank Wilson', 'user3@company.com'],
      ['Grace Lee', 'user4@company.com'],
      ['Henry Taylor', 'user5@company.com'],
      ['Iris Anderson', 'user6@company.com'],
      ['Jack Thomas', 'user7@company.com'],
      ['Karen Jackson', 'user8@company.com'],
      ['Leo White', 'user9@company.com'],
      ['Mia Harris', 'user10@company.com'],
      ['Noah Clark', 'user11@company.com'],
      ['Olivia Lewis', 'user12@company.com'],
      ['Paul Robinson', 'user13@company.com'],
      ['Quinn Walker', 'user14@company.com'],
      ['Rachel Hall', 'user15@company.com'],
      ['Sam Allen', 'user16@company.com'],
      ['Tina Young', 'user17@company.com'],
      ['Uma King', 'user18@company.com'],
      ['Victor Wright', 'user19@company.com'],
      ['Wendy Scott', 'user20@company.com'],
      ['Xander Green', 'user21@company.com'],
      ['Yara Adams', 'user22@company.com'],
      ['Zane Baker', 'user23@company.com'],
      ['Amy Nelson', 'user24@company.com'],
      ['Brian Carter', 'user25@company.com'],
    ];
    for (const [name, email] of users) {
      await client.query(
        `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
        [name, email, userHash, 'user']
      );
    }

    // Insert sample requests for demo
    const sampleRequests = [
      {
        request_id: 'REQ-000001',
        requestor_name: 'David Brown',
        employee_id: 'EMP001',
        email: 'aishwaryadharmar9@gmail.com',
        request_type: 'access',
        source_channel: 'portal',
        priority: 'high',
        raw_description: 'Need access to production database for debugging critical issue',
        ai_summary: 'Production database access request for critical debugging',
        ai_details: 'Employee David Brown requires read-only access to the production PostgreSQL database to investigate and resolve a critical data inconsistency issue affecting customer reports. The issue has been reported by multiple clients.',
        ai_next_action: 'Grant temporary read-only production DB access with 48-hour expiry. Require supervisor approval and audit logging.',
        status: 'reviewed',
        created_by: 5,
        assigned_supervisor: 2,
      },
      {
        request_id: 'REQ-000002',
        requestor_name: 'Eva Martinez',
        employee_id: 'EMP002',
        email: 'user2@company.com',
        request_type: 'issue',
        source_channel: 'email',
        priority: 'medium',
        raw_description: 'VPN connection drops frequently when working from home',
        ai_summary: 'Recurring VPN connectivity issues during remote work',
        ai_details: 'Eva Martinez reports intermittent VPN disconnections occurring 3-5 times daily during remote work sessions. Issue started after the latest VPN client update. Affects productivity and causes unsaved work loss.',
        ai_next_action: 'Schedule IT support call. Check VPN client version and consider rollback. Test network stability.',
        status: 'draft',
        created_by: 6,
        assigned_supervisor: 3,
      },
      {
        request_id: 'REQ-000003',
        requestor_name: 'Frank Wilson',
        employee_id: 'EMP003',
        email: 'user3@company.com',
        request_type: 'change',
        source_channel: 'chat',
        priority: 'low',
        raw_description: 'Request to change team Slack channel naming convention to include project codes',
        ai_summary: 'Slack channel naming convention update request',
        ai_details: 'Frank Wilson proposes updating the team Slack channel naming convention to include project codes for better organization. Current format: #team-name. Proposed format: #PROJ-team-name.',
        ai_next_action: 'Review proposal with team leads. If approved, create migration plan for existing channels.',
        status: 'approved',
        created_by: 7,
        assigned_supervisor: 2,
      },
      {
        request_id: 'REQ-000004',
        requestor_name: 'Grace Lee',
        employee_id: 'EMP004',
        email: 'user4@company.com',
        request_type: 'information',
        source_channel: 'portal',
        priority: 'low',
        raw_description: 'Need information about the company password policy and rotation schedule',
        ai_summary: 'Inquiry about company password policy documentation',
        ai_details: 'Grace Lee is requesting information about the current password policy including complexity requirements, rotation schedule, and multi-factor authentication setup procedures.',
        ai_next_action: 'Share link to company security policy documentation. Schedule onboarding session if needed.',
        status: 'closed',
        created_by: 8,
        assigned_supervisor: 4,
      },
      {
        request_id: 'REQ-000005',
        requestor_name: 'Henry Taylor',
        employee_id: 'EMP005',
        email: 'user5@company.com',
        request_type: 'access',
        source_channel: 'email',
        priority: 'high',
        raw_description: 'Urgent: Need admin access to AWS console for deploying hotfix to production',
        ai_summary: 'Urgent AWS admin access for production hotfix deployment',
        ai_details: 'Henry Taylor requires temporary AWS console admin access to deploy an emergency hotfix addressing a security vulnerability in the payment processing module. The fix has been reviewed by the security team.',
        ai_next_action: 'Escalate to security team for expedited approval. Grant time-limited admin access with full audit trail.',
        status: 'draft',
        created_by: 9,
        assigned_supervisor: 2,
      },
    ];

    for (const req of sampleRequests) {
      const dueDays = req.priority === 'high' ? 1 : req.priority === 'medium' ? 3 : 5;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);

      await client.query(
        `INSERT INTO requests (request_id, requestor_name, employee_id, email, request_type, source_channel, priority, raw_description, ai_summary, ai_details, ai_next_action, status, due_date, created_by, assigned_supervisor)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (request_id) DO NOTHING`,
        [req.request_id, req.requestor_name, req.employee_id, req.email, req.request_type, req.source_channel, req.priority, req.raw_description, req.ai_summary, req.ai_details, req.ai_next_action, req.status, dueDate, req.created_by, req.assigned_supervisor]
      );
    }

    // Add sample request tags
    await client.query(`INSERT INTO request_tags (request_id, tag_id) VALUES (1, 1), (1, 2) ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO request_tags (request_id, tag_id) VALUES (2, 4), (2, 6) ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO request_tags (request_id, tag_id) VALUES (5, 1), (5, 2), (5, 5) ON CONFLICT DO NOTHING`);

    // Add sample comments
    await client.query(
      `INSERT INTO comments (request_id, comment, created_by, action_completed) VALUES
        (1, 'Reviewed access scope. Read-only access seems appropriate.', 2, false),
        (1, 'Please provide specific table names needed for debugging.', 2, false),
        (2, 'VPN client version confirmed as 4.2.1. Known issue reported.', 3, true)
      `
    );

    // Add audit log entries
    await client.query(
      `INSERT INTO audit_log (action, performed_by, entity_type, entity_id, details) VALUES
        ('REQUEST_CREATED', 5, 'request', 1, 'Created request REQ-000001'),
        ('REQUEST_CREATED', 6, 'request', 2, 'Created request REQ-000002'),
        ('STATUS_CHANGED', 2, 'request', 1, 'Status changed from draft to reviewed'),
        ('REQUEST_CREATED', 7, 'request', 3, 'Created request REQ-000003'),
        ('STATUS_CHANGED', 2, 'request', 3, 'Status changed from draft to approved'),
        ('USER_LOGIN', 1, 'user', 1, 'Admin logged in')
      `
    );

    await client.query('COMMIT');
    console.log('Seed data inserted successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
