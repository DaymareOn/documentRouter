import { Router } from 'express';
import { getPool } from '../db/pool';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
  } catch {
    res.status(503).json({ success: false, error: 'Database unavailable' });
  }
});
