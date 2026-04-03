const express = require('express');
const { toolDefs } = require('../../api/lib/tools');

const router = express.Router();

router.post('/', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const { calls } = req.body || {};

  if (!calls || !Array.isArray(calls) || calls.length === 0) {
    res.status(400).json({ error: 'calls array is required' });
    return;
  }

  try {
    const results = [];
    for (const call of calls) {
      const def = toolDefs[call.name];
      if (!def) {
        results.push({ name: call.name, error: `Unknown tool: ${call.name}` });
        continue;
      }
      try {
        const result = await def.handler(call.args || {});
        results.push({ name: call.name, result });
      } catch (err) {
        results.push({ name: call.name, error: err.message });
      }
    }
    res.json({ results });
  } catch (error) {
    console.error('Chat-tools error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;
