const isPostgres = process.env.DB_DRIVER === 'postgres';

function createSql(url) {
  if (isPostgres) {
    const postgres = require('postgres');
    return postgres(url, { ssl: url.includes('sslmode=require') ? 'require' : false });
  }
  const { neon } = require('@neondatabase/serverless');
  return neon(url);
}

module.exports = { createSql, isPostgres };
