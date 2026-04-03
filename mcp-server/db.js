const postgres = require('postgres');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? 'require' : false,
  max: 5,
  idle_timeout: 30,
  connect_timeout: 10,
});

module.exports = { sql };
