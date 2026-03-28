const { createSql } = require('../src/config/db');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sql = createSql(process.env.DATABASE_URL);

module.exports = { sql };
