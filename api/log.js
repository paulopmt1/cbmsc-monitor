const { createSql } = require('../src/config/db');

function getDb() {
  return createSql(process.env.DATABASE_URL);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { user_name, action, success = true, details } = req.body || {};

  if (!action) {
    res.status(400).json({ error: 'action is required' });
    return;
  }

  try {
    const sql = getDb();
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
};
