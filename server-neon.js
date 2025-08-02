const express = require('express');
const axios = require('axios');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Neon database connection
const sql = neon(process.env.DATABASE_URL);

// Initialize database table
async function initializeDatabase() {
  try {
    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS occurrences (
        id_ocorrencia VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create index for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_occurrences_created_at 
      ON occurrences(created_at DESC)
    `;
    
    // Create index for emergency type searches
    await sql`
      CREATE INDEX IF NOT EXISTS idx_occurrences_emergency_type 
      ON occurrences USING GIN ((data->>'nm_tp_emergencia'))
    `;
    
    // Create index for city searches
    await sql`
      CREATE INDEX IF NOT EXISTS idx_occurrences_city 
      ON occurrences USING GIN ((data->>'nm_cidade'))
    `;
    
    console.log('Neon database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Initialize database on startup
initializeDatabase();

// /readOccurrences endpoint
app.get('/readOccurrences', async (req, res) => {
  try {
    // Make POST call to the API
    const requestData = {
      "user": {
        "cidade": [
          8379
        ]
      },
      "emergencies": [
        {
          "id": 8,
          "title": "Acidente de Trânsito",
          "choosed": 1
        },
        {
          "id": 5,
          "title": "Atendimento Pré-Hospitalar",
          "choosed": 1
        },
        {
          "id": 2,
          "title": "Auxílios/Apoios",
          "choosed": 1
        },
        {
          "id": 10,
          "title": "Averiguação/Corte de Árvore",
          "choosed": 1
        },
        {
          "id": 11,
          "title": "Averiguação/Manejo de Inseto",
          "choosed": 1
        },
        {
          "id": 12,
          "title": "Ação Preventiva Social",
          "choosed": 1
        },
        {
          "id": 9,
          "title": "Ações Preventivas",
          "choosed": 1
        },
        {
          "id": 7,
          "title": "Diversos",
          "choosed": 1
        },
        {
          "id": 1,
          "title": "Incêndio",
          "choosed": 1
        },
        {
          "id": 3,
          "title": "Produtos Perigosos",
          "choosed": 1
        },
        {
          "id": 13,
          "title": "Risco Potencial",
          "choosed": 1
        },
        {
          "id": 4,
          "title": "Salvamento/Busca/Resgate",
          "choosed": 1
        }
      ]
    };
    
    const response = await axios.post('https://api-gateway.cbm.sc.gov.br/cidadao/ocorrencias/listar/', requestData);
    
    // Check if data array exists
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      let savedCount = 0;
      let skippedCount = 0;
      
      // Iterate through each result
      for (const occurrence of response.data.data) {
        // Check if object with this id_ocorrencia already exists
        const existingResult = await sql`
          SELECT id_ocorrencia FROM occurrences WHERE id_ocorrencia = ${occurrence.id_ocorrencia}
        `;
        
        if (existingResult.length === 0) {
          // Save the object to database
          await sql`
            INSERT INTO occurrences (id_ocorrencia, data) VALUES (${occurrence.id_ocorrencia}, ${occurrence})
          `;
          savedCount++;
        } else {
          skippedCount++;
        }
      }
      
      res.json({
        message: 'ok',
        processed: response.data.data.length,
        saved: savedCount,
        skipped: skippedCount
      });
    } else {
      res.json({
        message: 'ok',
        note: 'No data array found in response'
      });
    }
  } catch (error) {
    console.error('Error processing occurrences:', error.message);
    res.status(500).json({
      message: 'error',
      error: error.message
    });
  }
});

// Get all occurrences
app.get('/occurrences', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    // Get total count
    const countResult = await sql`SELECT COUNT(*) FROM occurrences`;
    const total = parseInt(countResult[0].count);
    
    // Get occurrences with pagination
    const result = await sql`
      SELECT * FROM occurrences 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const occurrences = result.map(row => ({
      id_ocorrencia: row.id_ocorrencia,
      created_at: row.created_at,
      data: row.data
    }));
    
    res.json({ 
      message: 'ok', 
      data: occurrences, 
      count: occurrences.length,
      total: total
    });
  } catch (error) {
    console.error('Error fetching occurrences:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Get occurrence by ID
app.get('/occurrences/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const result = await sql`
      SELECT * FROM occurrences WHERE id_ocorrencia = ${id}
    `;
    
    if (result.length === 0) {
      res.status(404).json({ message: 'error', error: 'Occurrence not found' });
    } else {
      const occurrence = result[0];
      res.json({ 
        message: 'ok', 
        data: {
          id_ocorrencia: occurrence.id_ocorrencia,
          created_at: occurrence.created_at,
          data: occurrence.data
        }
      });
    }
  } catch (error) {
    console.error('Error fetching occurrence:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Search occurrences by emergency type
app.get('/occurrences/emergency/:type', async (req, res) => {
  try {
    const emergencyType = req.params.type;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    const result = await sql`
      SELECT * FROM occurrences 
      WHERE data->>'nm_tp_emergencia' ILIKE ${`%${emergencyType}%`}
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const occurrences = result.map(row => ({
      id_ocorrencia: row.id_ocorrencia,
      created_at: row.created_at,
      data: row.data
    }));
    
    res.json({ 
      message: 'ok', 
      data: occurrences, 
      count: occurrences.length,
      searchTerm: emergencyType
    });
  } catch (error) {
    console.error('Error searching occurrences:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Search occurrences by city
app.get('/occurrences/city/:city', async (req, res) => {
  try {
    const city = req.params.city;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    const result = await sql`
      SELECT * FROM occurrences 
      WHERE data->>'nm_cidade' ILIKE ${`%${city}%`}
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const occurrences = result.map(row => ({
      id_ocorrencia: row.id_ocorrencia,
      created_at: row.created_at,
      data: row.data
    }));
    
    res.json({ 
      message: 'ok', 
      data: occurrences, 
      count: occurrences.length,
      searchTerm: city
    });
  } catch (error) {
    console.error('Error searching occurrences:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Get statistics
app.get('/occurrences/stats', async (req, res) => {
  try {
    // Get total count
    const totalResult = await sql`SELECT COUNT(*) FROM occurrences`;
    const total = parseInt(totalResult[0].count);
    
    // Get statistics by emergency type
    const emergencyTypeResult = await sql`
      SELECT data->>'nm_tp_emergencia' as emergency_type, COUNT(*) as count
      FROM occurrences 
      WHERE data->>'nm_tp_emergencia' IS NOT NULL
      GROUP BY data->>'nm_tp_emergencia'
      ORDER BY count DESC
    `;
    
    // Get statistics by city
    const cityResult = await sql`
      SELECT data->>'nm_cidade' as city, COUNT(*) as count
      FROM occurrences 
      WHERE data->>'nm_cidade' IS NOT NULL
      GROUP BY data->>'nm_cidade'
      ORDER BY count DESC
    `;
    
    // Get statistics by date
    const dateResult = await sql`
      SELECT DATE(data->>'ts_ocorrencia') as date, COUNT(*) as count
      FROM occurrences 
      WHERE data->>'ts_ocorrencia' IS NOT NULL
      GROUP BY DATE(data->>'ts_ocorrencia')
      ORDER BY date DESC
    `;
    
    const stats = {
      total: total,
      byEmergencyType: {},
      byCity: {},
      byDate: {}
    };
    
    // Convert results to objects
    emergencyTypeResult.forEach(row => {
      stats.byEmergencyType[row.emergency_type] = parseInt(row.count);
    });
    
    cityResult.forEach(row => {
      stats.byCity[row.city] = parseInt(row.count);
    });
    
    dateResult.forEach(row => {
      stats.byDate[row.date] = parseInt(row.count);
    });
    
    res.json({ message: 'ok', data: stats });
  } catch (error) {
    console.error('Error fetching statistics:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Delete occurrence by ID
app.delete('/occurrences/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const result = await sql`
      DELETE FROM occurrences WHERE id_ocorrencia = ${id} RETURNING id_ocorrencia
    `;
    
    if (result.length === 0) {
      res.status(404).json({ message: 'error', error: 'Occurrence not found' });
    } else {
      res.json({ message: 'ok', deleted: id, changes: result.length });
    }
  } catch (error) {
    console.error('Error deleting occurrence:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running with Neon Database!', 
    endpoints: [
      '/readOccurrences',
      '/occurrences',
      '/occurrences/:id',
      '/occurrences/emergency/:type',
      '/occurrences/city/:city',
      '/occurrences/stats'
    ],
    database: 'Neon PostgreSQL'
  });
});

// Export for Vercel
module.exports = app; 