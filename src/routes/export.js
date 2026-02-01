const express = require('express');
const { sql } = require('../config/database');

const router = express.Router();

// Escape a value for MySQL string literal in INSERT
function escapeMySQLValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (typeof value === 'object') return `'${escapeMySQLString(JSON.stringify(value))}'`;
  return `'${escapeMySQLString(String(value))}'`;
}

function escapeMySQLString(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x00/g, '\\0');
}

// MySQL-compatible CREATE TABLE statements (order: no FKs first, then occurrences with FKs)
const MYSQL_CREATE_TABLES = `-- CBM SC Monitor - MySQL-compatible dump
-- Run with: mysql -u user -p database_name < dump.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS \`occurrences\`;
DROP TABLE IF EXISTS \`cities\`;
DROP TABLE IF EXISTS \`tp_emergencia\`;

CREATE TABLE \`tp_emergencia\` (
  \`id\` int NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`title\` (\`title\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`cities\` (
  \`id_cidade\` int NOT NULL,
  \`nome_cidade\` varchar(255) NOT NULL,
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_cidade\`),
  UNIQUE KEY \`nome_cidade\` (\`nome_cidade\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`occurrences\` (
  \`id_ocorrencia\` varchar(255) NOT NULL,
  \`id_tp_emergencia\` int DEFAULT NULL,
  \`id_cidade\` int DEFAULT NULL,
  \`lat_logradouro\` decimal(10,8) DEFAULT NULL,
  \`long_logradouro\` decimal(11,8) DEFAULT NULL,
  \`data\` json NOT NULL,
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`ts_ocorrencia\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_ocorrencia\`),
  KEY \`idx_occurrences_created_at\` (\`created_at\`),
  KEY \`idx_occurrences_tp_emergencia\` (\`id_tp_emergencia\`),
  KEY \`idx_occurrences_city\` (\`id_cidade\`),
  CONSTRAINT \`occurrences_id_tp_emergencia_fkey\` FOREIGN KEY (\`id_tp_emergencia\`) REFERENCES \`tp_emergencia\` (\`id\`),
  CONSTRAINT \`occurrences_id_cidade_fkey\` FOREIGN KEY (\`id_cidade\`) REFERENCES \`cities\` (\`id_cidade\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
`;

/**
 * GET /export-db
 * Exports the entire database as MySQL-compatible SQL (CREATE TABLE + INSERT).
 * Usage: curl -o dump.sql http://localhost:PORT/export-db
 *        mysql -u user -p database_name < dump.sql
 */
router.get('/', async (req, res) => {
  try {
    const chunks = [MYSQL_CREATE_TABLES];

    // tp_emergencia
    const tpRows = await sql`SELECT * FROM tp_emergencia ORDER BY id`;
    if (tpRows.length > 0) {
      const columns = ['id', 'title', 'created_at'];
      const colList = columns.map(c => `\`${c}\``).join(', ');
      const BATCH_SIZE = 50;
      for (let i = 0; i < tpRows.length; i += BATCH_SIZE) {
        const batch = tpRows.slice(i, i + BATCH_SIZE);
        const values = batch.map(row => {
          const vals = columns.map(col => escapeMySQLValue(row[col]));
          return `(${vals.join(',')})`;
        });
        chunks.push(`INSERT INTO \`tp_emergencia\` (${colList}) VALUES\n${values.join(',\n')};\n`);
      }
    }
    chunks.push('\n');

    // cities
    const cityRows = await sql`SELECT * FROM cities ORDER BY id_cidade`;
    if (cityRows.length > 0) {
      const columns = ['id_cidade', 'nome_cidade', 'created_at'];
      const colList = columns.map(c => `\`${c}\``).join(', ');
      const BATCH_SIZE = 50;
      for (let i = 0; i < cityRows.length; i += BATCH_SIZE) {
        const batch = cityRows.slice(i, i + BATCH_SIZE);
        const values = batch.map(row => {
          const vals = columns.map(col => escapeMySQLValue(row[col]));
          return `(${vals.join(',')})`;
        });
        chunks.push(`INSERT INTO \`cities\` (${colList}) VALUES\n${values.join(',\n')};\n`);
      }
    }
    chunks.push('\n');

    // occurrences
    const occRows = await sql`SELECT * FROM occurrences ORDER BY created_at`;
    if (occRows.length > 0) {
      const columns = ['id_ocorrencia', 'id_tp_emergencia', 'id_cidade', 'lat_logradouro', 'long_logradouro', 'data', 'created_at', 'ts_ocorrencia'];
      const colList = columns.map(c => `\`${c}\``).join(', ');
      const BATCH_SIZE = 50;
      for (let i = 0; i < occRows.length; i += BATCH_SIZE) {
        const batch = occRows.slice(i, i + BATCH_SIZE);
        const values = batch.map(row => {
          const vals = columns.map(col => escapeMySQLValue(row[col]));
          return `(${vals.join(',')})`;
        });
        chunks.push(`INSERT INTO \`occurrences\` (${colList}) VALUES\n${values.join(',\n')};\n`);
      }
    }

    const dump = chunks.join('');
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cbmsc-monitor-dump.sql"'
    });
    res.send(dump);
  } catch (error) {
    console.error('Error exporting database:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

module.exports = router;
