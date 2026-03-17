const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

// Neon database connection
const sql = neon(process.env.DATABASE_URL);

// Initialize database table
async function initializeDatabase() {
  try {
    // Create emergency types table
    await sql`
      CREATE TABLE IF NOT EXISTS tp_emergencia (
        id INTEGER PRIMARY KEY,
        title VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create cities table
    await sql`
      CREATE TABLE IF NOT EXISTS cities (
        id_cidade INTEGER PRIMARY KEY,
        nome_cidade VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create occurrences table with foreign keys
    await sql`
      CREATE TABLE IF NOT EXISTS occurrences (
        id_ocorrencia VARCHAR(255) PRIMARY KEY,
        id_tp_emergencia INTEGER REFERENCES tp_emergencia(id),
        id_cidade INTEGER REFERENCES cities(id_cidade),
        lat_logradouro DECIMAL(10, 8),
        long_logradouro DECIMAL(11, 8),
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ts_ocorrencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_occurrences_created_at 
      ON occurrences(created_at DESC)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_occurrences_tp_emergencia 
      ON occurrences(id_tp_emergencia)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_occurrences_city 
      ON occurrences(id_cidade)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_occurrences_ts 
      ON occurrences(ts_ocorrencia DESC)
    `;
    
    console.log('Neon database initialized successfully with emergency types and cities');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = {
  sql,
  initializeDatabase
}; 