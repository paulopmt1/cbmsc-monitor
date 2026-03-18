const express = require('express');
const { sql } = require('../config/database');

const router = express.Router();

router.post('/', async (req, res) => {
  const { user_name, action, success = true, details } = req.body || {};

  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }

  try {
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    await sql`
      INSERT INTO access_logs (user_name, action, success, details, ip_address, user_agent)
      VALUES (${user_name || null}, ${action}, ${success}, ${details ? JSON.stringify(details) : null}::jsonb, ${ip}, ${userAgent})
    `;

    res.json({ ok: true });
  } catch (error) {
    console.error('Log error:', error);
    res.status(500).json({ error: 'Failed to log' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { limit = 100, action } = req.query;
    const lim = Math.min(parseInt(limit) || 100, 500);

    const rows = action
      ? await sql`SELECT * FROM access_logs WHERE action = ${action} ORDER BY created_at DESC LIMIT ${lim}`
      : await sql`SELECT * FROM access_logs ORDER BY created_at DESC LIMIT ${lim}`;

    res.json({ message: 'ok', data: rows, total: rows.length });
  } catch (error) {
    console.error('Fetch logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
