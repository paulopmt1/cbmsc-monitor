const express = require('express');
const { sql } = require('../config/database');

const router = express.Router();

// Get emergency types
router.get('/emergency-types', async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM tp_emergencia ORDER BY id
    `;
    
    res.json({ 
      message: 'ok', 
      data: result
    });
  } catch (error) {
    console.error('Error fetching emergency types:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Get cities
router.get('/cities', async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM cities ORDER BY nome_cidade
    `;
    
    res.json({ 
      message: 'ok', 
      data: result
    });
  } catch (error) {
    console.error('Error fetching cities:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

module.exports = router; 