import pool from '../db/pool.js';

export const logAudit = async (action, performedBy, entityType, entityId, details) => {
  try {
    await pool.query(
      `INSERT INTO audit_log (action, performed_by, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [action, performedBy, entityType, entityId, details]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};
