import { Router } from 'express';
import pool from '../db/pool.js';
import { logAudit } from '../utils/audit.js';

const router = Router();

// Get comments for a request
router.get('/:requestId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as author_name, u.role as author_role
       FROM comments c
       JOIN users u ON c.created_by = u.id
       WHERE c.request_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.requestId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment
router.post('/:requestId', async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const result = await pool.query(
      `INSERT INTO comments (request_id, comment, created_by) VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.requestId, comment, req.user.id]
    );

    // Get author info
    const userResult = await pool.query('SELECT name, role FROM users WHERE id = $1', [req.user.id]);
    const row = { ...result.rows[0], author_name: userResult.rows[0].name, author_role: userResult.rows[0].role };

    await logAudit('COMMENT_ADDED', req.user.id, 'request', parseInt(req.params.requestId, 10), 'Added comment');
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle action completed
router.patch('/:commentId/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE comments SET action_completed = NOT action_completed WHERE id = $1 RETURNING *`,
      [req.params.commentId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
