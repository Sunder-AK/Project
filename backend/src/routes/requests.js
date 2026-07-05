import { Router } from 'express';
import pool from '../db/pool.js';
import { authorize } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { sendTicketCreatedEmail, sendTicketApprovedEmail, sendTicketDeclinedEmail } from '../utils/email.js';
import { createNotification } from './notifications.js';

const router = Router();

// Generate next request ID
const getNextRequestId = async () => {
  const result = await pool.query(
    "SELECT request_id FROM requests ORDER BY id DESC LIMIT 1"
  );
  if (result.rows.length === 0) return 'REQ-000001';
  const last = parseInt(result.rows[0].request_id.split('-')[1], 10);
  return `REQ-${String(last + 1).padStart(6, '0')}`;
};

// Get all requests with filters
router.get('/', async (req, res) => {
  try {
    const { status, priority, request_type, requestor, overdue, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = [];
    let params = [];
    let idx = 1;

    // Role-based filtering
    if (req.user.role === 'user') {
      where.push(`r.created_by = $${idx++}`);
      params.push(req.user.id);
    } else if (req.user.role === 'supervisor') {
      where.push(`(r.assigned_supervisor = $${idx} OR r.created_by = $${idx})`);
      params.push(req.user.id);
      idx++;
    }

    if (status) { where.push(`r.status = $${idx++}`); params.push(status); }
    if (priority) { where.push(`r.priority = $${idx++}`); params.push(priority); }
    if (request_type) { where.push(`r.request_type = $${idx++}`); params.push(request_type); }
    if (requestor) { where.push(`r.requestor_name ILIKE $${idx++}`); params.push(`%${requestor}%`); }
    if (overdue === 'true') { where.push(`r.due_date < NOW() AND r.status NOT IN ('closed', 'approved', 'declined')`); }
    if (search) {
      where.push(`(r.request_id ILIKE $${idx} OR r.requestor_name ILIKE $${idx} OR r.raw_description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM requests r ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT r.*, u.name as supervisor_name, c.name as creator_name
       FROM requests r
       LEFT JOIN users u ON r.assigned_supervisor = u.id
       LEFT JOIN users c ON r.created_by = c.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit, 10), offset]
    );

    // Get tags for each request
    const requestIds = dataResult.rows.map(r => r.id);
    let tagsMap = {};
    if (requestIds.length > 0) {
      const tagsResult = await pool.query(
        `SELECT rt.request_id, t.tag_name FROM request_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.request_id = ANY($1)`,
        [requestIds]
      );
      for (const row of tagsResult.rows) {
        if (!tagsMap[row.request_id]) tagsMap[row.request_id] = [];
        tagsMap[row.request_id].push(row.tag_name);
      }
    }

    const requests = dataResult.rows.map(r => ({
      ...r,
      tags: tagsMap[r.id] || [],
      is_overdue: r.due_date && new Date(r.due_date) < new Date() && !['closed', 'approved', 'declined'].includes(r.status),
    }));

    res.json({
      requests,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard stats (must be before /:id)
router.get('/stats/dashboard', async (req, res) => {
  try {
    let roleFilter = '';
    let params = [];

    if (req.user.role === 'user') {
      roleFilter = 'WHERE created_by = $1';
      params = [req.user.id];
    } else if (req.user.role === 'supervisor') {
      roleFilter = 'WHERE assigned_supervisor = $1 OR created_by = $1';
      params = [req.user.id];
    }

    const totalOpen = await pool.query(
      `SELECT COUNT(*) FROM requests ${roleFilter ? roleFilter + " AND status NOT IN ('closed')" : "WHERE status NOT IN ('closed')"}`, params
    );

    const byStatus = await pool.query(
      `SELECT status, COUNT(*) as count FROM requests ${roleFilter} GROUP BY status`, params
    );

    const byPriority = await pool.query(
      `SELECT priority, COUNT(*) as count FROM requests ${roleFilter} GROUP BY priority`, params
    );

    const byType = await pool.query(
      `SELECT request_type, COUNT(*) as count FROM requests ${roleFilter} GROUP BY request_type`, params
    );

    const overdue = await pool.query(
      `SELECT COUNT(*) FROM requests ${roleFilter ? roleFilter + " AND" : "WHERE"} due_date < NOW() AND status NOT IN ('closed', 'approved', 'declined')`, params
    );

    const onTime = await pool.query(
      `SELECT COUNT(*) FROM requests ${roleFilter ? roleFilter + " AND" : "WHERE"} (due_date >= NOW() OR status IN ('closed', 'approved', 'declined'))`, params
    );

    const trend = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM requests ${roleFilter}
       GROUP BY DATE(created_at)
       ORDER BY date DESC LIMIT 30`, params
    );

    res.json({
      totalOpen: parseInt(totalOpen.rows[0].count, 10),
      byStatus: byStatus.rows,
      byPriority: byPriority.rows,
      byType: byType.rows,
      overdue: parseInt(overdue.rows[0].count, 10),
      onTime: parseInt(onTime.rows[0].count, 10),
      trend: trend.rows,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single request
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as supervisor_name, c.name as creator_name
       FROM requests r
       LEFT JOIN users u ON r.assigned_supervisor = u.id
       LEFT JOIN users c ON r.created_by = c.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const tagsResult = await pool.query(
      `SELECT t.id, t.tag_name FROM request_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.request_id = $1`,
      [req.params.id]
    );

    const request = {
      ...result.rows[0],
      tags: tagsResult.rows,
      is_overdue: result.rows[0].due_date && new Date(result.rows[0].due_date) < new Date() && !['closed', 'approved', 'declined'].includes(result.rows[0].status),
    };

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create request
router.post('/', async (req, res) => {
  try {
    const {
      requestor_name, employee_id, email, request_type,
      source_channel, priority, raw_description, assigned_supervisor,
    } = req.body;

    if (!requestor_name || !employee_id || !email || !request_type || !source_channel || !priority || !raw_description) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const requestId = await getNextRequestId();

    // Calculate due date from SLA rules
    const slaResult = await pool.query('SELECT days FROM sla_rules WHERE priority = $1', [priority]);
    const slaDays = slaResult.rows.length > 0 ? slaResult.rows[0].days : 5;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + slaDays);

    const result = await pool.query(
      `INSERT INTO requests (request_id, requestor_name, employee_id, email, request_type, source_channel, priority, raw_description, status, due_date, created_by, assigned_supervisor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10,$11)
       RETURNING *`,
      [requestId, requestor_name, employee_id, email, request_type, source_channel, priority, raw_description, dueDate, req.user.id, assigned_supervisor || null]
    );

    await logAudit('REQUEST_CREATED', req.user.id, 'request', result.rows[0].id, `Created request ${requestId}`);

    // Send email notification to supervisor
    if (assigned_supervisor) {
      const supResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [assigned_supervisor]);
      if (supResult.rows.length > 0) {
        sendTicketCreatedEmail({
          supervisorEmail: supResult.rows[0].email,
          supervisorName: supResult.rows[0].name,
          requestId,
          requestorName: requestor_name,
          requestType: request_type,
          priority,
          description: raw_description,
        });
      }
    }

    // Send in-app notifications
    if (assigned_supervisor) {
      createNotification(assigned_supervisor, 'new_request', 'New Request Assigned', `${requestor_name} submitted request ${requestId} (${priority} priority)`, `/requests/${result.rows[0].id}`);
    }
    // Notify all admins
    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins.rows) {
      createNotification(admin.id, 'new_request', 'New Request Created', `${requestor_name} created request ${requestId}`, `/requests/${result.rows[0].id}`);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update request
router.put('/:id', async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [requestId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const current = existing.rows[0];
    if (current.status === 'approved' || current.status === 'closed' || current.status === 'declined') {
      // Only admin can update closed/approved/declined requests
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Cannot modify approved/closed/declined requests' });
      }
    }

    const {
      requestor_name, employee_id, email, request_type,
      source_channel, priority, raw_description,
      ai_summary, ai_details, ai_next_action,
      status, assigned_supervisor, tags,
    } = req.body;

    // Recalculate due date if priority changed
    let dueDate = current.due_date;
    if (priority && priority !== current.priority) {
      const slaResult = await pool.query('SELECT days FROM sla_rules WHERE priority = $1', [priority]);
      const slaDays = slaResult.rows.length > 0 ? slaResult.rows[0].days : 5;
      dueDate = new Date(current.created_at);
      dueDate.setDate(dueDate.getDate() + slaDays);
    }

    const result = await pool.query(
      `UPDATE requests SET
        requestor_name = COALESCE($1, requestor_name),
        employee_id = COALESCE($2, employee_id),
        email = COALESCE($3, email),
        request_type = COALESCE($4, request_type),
        source_channel = COALESCE($5, source_channel),
        priority = COALESCE($6, priority),
        raw_description = COALESCE($7, raw_description),
        ai_summary = COALESCE($8, ai_summary),
        ai_details = COALESCE($9, ai_details),
        ai_next_action = COALESCE($10, ai_next_action),
        status = COALESCE($11, status),
        assigned_supervisor = COALESCE($12, assigned_supervisor),
        due_date = $13,
        updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [requestor_name, employee_id, email, request_type, source_channel, priority, raw_description, ai_summary, ai_details, ai_next_action, status, assigned_supervisor, dueDate, requestId]
    );

    // Handle tags
    if (tags && Array.isArray(tags)) {
      await pool.query('DELETE FROM request_tags WHERE request_id = $1', [requestId]);
      for (const tagId of tags) {
        await pool.query(
          'INSERT INTO request_tags (request_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [requestId, tagId]
        );
      }
    }

    if (status && status !== current.status) {
      await logAudit('STATUS_CHANGED', req.user.id, 'request', requestId, `Status changed from ${current.status} to ${status}`);

      // Send email notifications on approval or decline
      if (status === 'approved' || status === 'declined') {
        // Get the request creator's info
        const creatorResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [current.created_by]);
        if (creatorResult.rows.length > 0) {
          const creator = creatorResult.rows[0];
          if (status === 'approved') {
            sendTicketApprovedEmail({
              userEmail: creator.email,
              userName: creator.name,
              requestId: current.request_id,
              requestorName: current.requestor_name,
              approverName: req.user.name,
            });
          } else if (status === 'declined') {
            sendTicketDeclinedEmail({
              userEmail: creator.email,
              userName: creator.name,
              requestId: current.request_id,
              requestorName: current.requestor_name,
              declinedBy: req.user.name,
              reason: req.body.decline_reason || '',
            });
          }
        }
      }
      // In-app notification to request creator
      if (current.created_by && current.created_by !== req.user.id) {
        const statusLabel = status === 'approved' ? '✅ Approved' : status === 'declined' ? '❌ Declined' : status.charAt(0).toUpperCase() + status.slice(1);
        createNotification(current.created_by, `status_${status}`, `Request ${statusLabel}`, `Your request ${current.request_id} was ${status} by ${req.user.name}`, `/requests/${requestId}`);
      }
    } else {
      await logAudit('REQUEST_UPDATED', req.user.id, 'request', requestId, `Updated request ${current.request_id}`);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
