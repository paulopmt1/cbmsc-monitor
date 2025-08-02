const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import modules
const { initializeDatabase } = require('./config/database');
const { initializeData } = require('./utils/initData');
const corsMiddleware = require('./middleware/cors');
const setupStaticFiles = require('./middleware/static');
const routes = require('./routes');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Setup static files
setupStaticFiles(app);

// CORS middleware
app.use(corsMiddleware);

// Mount routes
app.use('/', routes);

// Initialize database and data on startup
async function initializeApp() {
  try {
    await initializeDatabase();
    await initializeData();
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
}

// Initialize the application
initializeApp();

module.exports = app; 