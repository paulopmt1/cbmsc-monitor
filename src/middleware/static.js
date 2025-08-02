const express = require('express');
const path = require('path');
const fs = require('fs');

// Serve static files - try multiple possible paths
const setupStaticFiles = (app) => {
  // Try to serve static files from public directory if it exists
  if (fs.existsSync('./public')) {
    app.use(express.static('public'));
  } else if (fs.existsSync(path.join(__dirname, '..', '..', 'public'))) {
    app.use(express.static(path.join(__dirname, '..', '..', 'public')));
  }
};

module.exports = setupStaticFiles; 