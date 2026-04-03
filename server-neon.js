// Vercel serverless entrypoint.
//
// Important: do not call `listen()` in serverless. Export the Express app
// so Vercel can invoke it per-request.
const app = require( './src/app' );

module.exports = app;

