const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Import route modules
const occurrencesRoutes = require('./occurrences');
const referenceRoutes = require('./reference');

// Mount route modules
router.use('/', occurrencesRoutes);
router.use('/', referenceRoutes);

// Root endpoint - serve the web interface
router.get('/', (req, res) => {
  // Try multiple possible paths for the HTML file
  const possiblePaths = [
    './public/index.html',
    './index.html',
    path.join(__dirname, '..', '..', 'public', 'index.html'),
    path.join(__dirname, '..', '..', 'index.html')
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  
  // If HTML file not found, serve a simple API info page
  res.json({ 
    message: 'CBM SC Monitor API', 
    endpoints: [
      '/readOccurrences',
      '/occurrences',
      '/occurrences/:id',
      '/occurrences/emergency/:type',
      '/occurrences/city/:city',
      '/emergency-types',
      '/cities',
      '/occurrences/stats'
    ],
    database: 'Neon PostgreSQL with normalized emergency types',
    note: 'Web interface not available in this environment'
  });
});

// API info endpoint
router.get('/api', (req, res) => {
  res.json({ 
    message: 'CBM SC Monitor API', 
    endpoints: [
      '/readOccurrences',
      '/occurrences',
      '/occurrences/:id',
      '/occurrences/emergency/:type',
      '/occurrences/city/:city',
      '/emergency-types',
      '/cities',
      '/occurrences/stats'
    ],
    database: 'Neon PostgreSQL with normalized emergency types'
  });
});

module.exports = router; 