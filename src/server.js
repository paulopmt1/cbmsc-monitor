const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test the /readOccurrences endpoint at: http://localhost:${PORT}/readOccurrences`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

// Export for Vercel
module.exports = app; 