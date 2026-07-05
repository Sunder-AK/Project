import { Router } from 'express';
import pool from '../db/pool.js';
import { authorize } from '../middleware/auth.js';

const router = Router();

// Get SLA rules
router.get('/sla', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sla_rules ORDER BY days ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update SLA rule (admin only)
router.put('/sla/:priority', authorize('admin'), async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days < 1) {
      return res.status(400).json({ error: 'Days must be a positive integer' });
    }
    const result = await pool.query(
      'UPDATE sla_rules SET days = $1, updated_by = $2, updated_at = NOW() WHERE priority = $3 RETURNING *',
      [days, req.user.id, req.params.priority]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SLA rule not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit log (admin only)
router.get('/audit-log', authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const countResult = await pool.query('SELECT COUNT(*) FROM audit_log');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT a.*, u.name as performer_name
       FROM audit_log a
       LEFT JOIN users u ON a.performed_by = u.id
       ORDER BY a.timestamp DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit, 10), offset]
    );

    res.json({
      logs: result.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all tags
router.get('/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY tag_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
