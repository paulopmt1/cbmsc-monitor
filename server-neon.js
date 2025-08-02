const express = require('express');
const axios = require('axios');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const PORT = process.env.PORT || 3000;

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files - try multiple possible paths
// Try to serve static files from public directory if it exists
if (fs.existsSync('./public')) {
  app.use(express.static('public'));
} else if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}

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

// Emergency types data
const emergencyTypes = [
  { id: 8, title: "Acidente de Trânsito" },
  { id: 5, title: "Atendimento Pré-Hospitalar" },
  { id: 2, title: "Auxílios/Apoios" },
  { id: 10, title: "Averiguação/Corte de Árvore" },
  { id: 11, title: "Averiguação/Manejo de Inseto" },
  { id: 12, title: "Ação Preventiva Social" },
  { id: 9, title: "Ações Preventivas" },
  { id: 7, title: "Diversos" },
  { id: 1, title: "Incêndio" },
  { id: 3, title: "Produtos Perigosos" },
  { id: 13, title: "Risco Potencial" },
  { id: 4, title: "Salvamento/Busca/Resgate" }
];

// Cities data (starting with VIDEIRA from the sample data)
const cities = [
  { id_cidade: 8379, nome_cidade: "VIDEIRA" },
  { id_cidade: 8177, nome_cidade: "JOAÇABA" }
];

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
    
    // Insert emergency types if they don't exist
    for (const emergencyType of emergencyTypes) {
      await sql`
        INSERT INTO tp_emergencia (id, title) 
        VALUES (${emergencyType.id}, ${emergencyType.title})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    
    // Insert cities if they don't exist
    for (const city of cities) {
      await sql`
        INSERT INTO cities (id_cidade, nome_cidade) 
        VALUES (${city.id_cidade}, ${city.nome_cidade})
        ON CONFLICT (id_cidade) DO NOTHING
      `;
    }
    
    console.log('Neon database initialized successfully with emergency types and cities');
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
          8379,
          8177
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
          // Extract emergency type ID from the occurrence data
          const emergencyTypeId = parseInt(occurrence.id_tp_emergencia) || null;
          
          // Extract city ID from the occurrence data
          const cityId = parseInt(occurrence.id_cidade) || null;
          
          // Extract GPS coordinates from the data
          const latitude = occurrence.lat_logradouro ? parseFloat(occurrence.lat_logradouro) : null;
          const longitude = occurrence.long_logradouro ? parseFloat(occurrence.long_logradouro) : null;
          
          // Extract occurrence timestamp from the data
          const occurrenceTimestamp = occurrence.ts_ocorrencia ? 
            new Date(occurrence.ts_ocorrencia) : new Date();
          
          // Save the object to database with foreign keys, GPS coordinates, and timestamp
          await sql`
            INSERT INTO occurrences (id_ocorrencia, id_tp_emergencia, id_cidade, lat_logradouro, long_logradouro, data, ts_ocorrencia) 
            VALUES (${occurrence.id_ocorrencia}, ${emergencyTypeId}, ${cityId}, ${latitude}, ${longitude}, ${occurrence}, ${occurrenceTimestamp})
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

  // Get all occurrences with emergency type information
  app.get('/occurrences', async (req, res) => {
    try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    // Get total count
    const countResult = await sql`SELECT COUNT(*) FROM occurrences`;
    const total = parseInt(countResult[0].count);
    
    // Get occurrences with pagination and emergency type info
    const result = await sql`
      SELECT o.*, t.title as emergency_type_title, c.nome_cidade as city_name
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      ORDER BY o.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const occurrences = result.map(row => ({
      id_ocorrencia: row.id_ocorrencia,
      id_tp_emergencia: row.id_tp_emergencia,
      id_cidade: row.id_cidade,
      emergency_type_title: row.emergency_type_title,
      city_name: row.city_name,
      lat_logradouro: row.lat_logradouro,
      long_logradouro: row.long_logradouro,
      created_at: row.created_at,
      ts_ocorrencia: row.ts_ocorrencia,
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
      SELECT o.*, t.title as emergency_type_title, c.nome_cidade as city_name
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.id_ocorrencia = ${id}
    `;
    
    if (result.length === 0) {
      res.status(404).json({ message: 'error', error: 'Occurrence not found' });
    } else {
      const occurrence = result[0];
      res.json({ 
        message: 'ok', 
        data: {
          id_ocorrencia: occurrence.id_ocorrencia,
          id_tp_emergencia: occurrence.id_tp_emergencia,
          id_cidade: occurrence.id_cidade,
          emergency_type_title: occurrence.emergency_type_title,
          city_name: occurrence.city_name,
          lat_logradouro: occurrence.lat_logradouro,
          long_logradouro: occurrence.long_logradouro,
          created_at: occurrence.created_at,
          ts_ocorrencia: occurrence.ts_ocorrencia,
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
      SELECT o.*, t.title as emergency_type_title, c.nome_cidade as city_name
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE t.title ILIKE ${`%${emergencyType}%`}
      ORDER BY o.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const occurrences = result.map(row => ({
      id_ocorrencia: row.id_ocorrencia,
      id_tp_emergencia: row.id_tp_emergencia,
      id_cidade: row.id_cidade,
      emergency_type_title: row.emergency_type_title,
      city_name: row.city_name,
      lat_logradouro: row.lat_logradouro,
      long_logradouro: row.long_logradouro,
      created_at: row.created_at,
      ts_ocorrencia: row.ts_ocorrencia,
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
      SELECT o.*, t.title as emergency_type_title, c.nome_cidade as city_name
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE c.nome_cidade ILIKE ${`%${city}%`}
      ORDER BY o.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const occurrences = result.map(row => ({
      id_ocorrencia: row.id_ocorrencia,
      id_tp_emergencia: row.id_tp_emergencia,
      id_cidade: row.id_cidade,
      emergency_type_title: row.emergency_type_title,
      city_name: row.city_name,
      lat_logradouro: row.lat_logradouro,
      long_logradouro: row.long_logradouro,
      created_at: row.created_at,
      ts_ocorrencia: row.ts_ocorrencia,
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

// Get emergency types
app.get('/emergency-types', async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM tp_emergencia ORDER BY id
    `;
    
    res.json({ 
      message: 'ok', 
      data: result
    });
  } catch (error) {
    console.error('Error fetching emergency types:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Get cities
app.get('/cities', async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM cities ORDER BY nome_cidade
    `;
    
    res.json({ 
      message: 'ok', 
      data: result
    });
  } catch (error) {
    console.error('Error fetching cities:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Get statistics
app.get('/occurrences/stats', async (req, res) => {
  try {
    // Get total count
    const totalResult = await sql`SELECT COUNT(*) FROM occurrences`;
    const total = parseInt(totalResult[0].count);
    
    // Get statistics by emergency type using the new table
    const emergencyTypeResult = await sql`
      SELECT t.title as emergency_type, COUNT(o.id_ocorrencia) as count
      FROM tp_emergencia t
      LEFT JOIN occurrences o ON t.id = o.id_tp_emergencia
      GROUP BY t.id, t.title
      ORDER BY count DESC
    `;
    
    // Get statistics by city
    const cityResult = await sql`
      SELECT c.nome_cidade as city, COUNT(o.id_ocorrencia) as count
      FROM cities c
      LEFT JOIN occurrences o ON c.id_cidade = o.id_cidade
      GROUP BY c.id_cidade, c.nome_cidade
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

// Root endpoint - serve the web interface
app.get('/', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  // Try multiple possible paths for the HTML file
  const possiblePaths = [
    './public/index.html',
    './index.html',
    path.join(__dirname, 'public', 'index.html'),
    path.join(__dirname, 'index.html')
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  
  // If HTML file not found, serve a simple API info page
  res.json({ 
    message: 'CBM SC Monitor API', 
    endpoints: [
      '/readOccurrences',
      '/occurrences',
      '/occurrences/:id',
      '/occurrences/emergency/:type',
      '/occurrences/city/:city',
      '/emergency-types',
      '/cities',
      '/occurrences/stats'
    ],
    database: 'Neon PostgreSQL with normalized emergency types',
    note: 'Web interface not available in this environment'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'CBM SC Monitor API', 
    endpoints: [
      '/readOccurrences',
      '/occurrences',
      '/occurrences/:id',
      '/occurrences/emergency/:type',
      '/occurrences/city/:city',
      '/emergency-types',
      '/cities',
      '/occurrences/stats'
    ],
    database: 'Neon PostgreSQL with normalized emergency types'
  });
});

// Export for Vercel
module.exports = app; 

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test the /readOccurrences endpoint at: http://localhost:${PORT}/readOccurrences`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  });
}); 
