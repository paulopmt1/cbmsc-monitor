const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Initialize database
const db = new sqlite3.Database('./occurrences.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    // Create emergency types table
    db.run(`CREATE TABLE IF NOT EXISTS tp_emergencia (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating emergency types table:', err.message);
      } else {
        console.log('Emergency types table ready.');
        
        // Insert emergency types
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
        
        emergencyTypes.forEach(emergencyType => {
          db.run('INSERT OR IGNORE INTO tp_emergencia (id, title) VALUES (?, ?)', 
            [emergencyType.id, emergencyType.title]);
        });
      }
    });
    
    // Create cities table
    db.run(`CREATE TABLE IF NOT EXISTS cities (
      id_cidade INTEGER PRIMARY KEY,
      nome_cidade TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating cities table:', err.message);
      } else {
        console.log('Cities table ready.');
        
        // Insert cities
        const cities = [
          { id_cidade: 8379, nome_cidade: "VIDEIRA" }
        ];
        
        cities.forEach(city => {
          db.run('INSERT OR IGNORE INTO cities (id_cidade, nome_cidade) VALUES (?, ?)', 
            [city.id_cidade, city.nome_cidade]);
        });
      }
    });
    
    // Create occurrences table with foreign keys
    db.run(`CREATE TABLE IF NOT EXISTS occurrences (
      id_ocorrencia TEXT PRIMARY KEY,
      id_tp_emergencia INTEGER,
      id_cidade INTEGER,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ts_ocorrencia DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_tp_emergencia) REFERENCES tp_emergencia(id),
      FOREIGN KEY (id_cidade) REFERENCES cities(id_cidade)
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Occurrences table ready.');
      }
    });
  }
});


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
        const exists = await new Promise((resolve, reject) => {
          db.get('SELECT id_ocorrencia FROM occurrences WHERE id_ocorrencia = ?', 
            [occurrence.id_ocorrencia], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (!exists) {
          // Extract emergency type ID from the occurrence data
          const emergencyTypeId = parseInt(occurrence.id_tp_emergencia) || null;
          
          // Extract city ID from the occurrence data
          const cityId = parseInt(occurrence.id_cidade) || null;
          
          // Extract occurrence timestamp from the data
          const occurrenceTimestamp = occurrence.ts_ocorrencia ? 
            new Date(occurrence.ts_ocorrencia).toISOString() : new Date().toISOString();
          
          // Save the object to database with foreign keys and timestamp
          await new Promise((resolve, reject) => {
            db.run('INSERT INTO occurrences (id_ocorrencia, id_tp_emergencia, id_cidade, data, ts_ocorrencia) VALUES (?, ?, ?, ?, ?)', 
              [occurrence.id_ocorrencia, emergencyTypeId, cityId, JSON.stringify(occurrence), occurrenceTimestamp], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
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
app.get('/occurrences', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  
  db.all(`
    SELECT o.*, t.title as emergency_type_title, c.nome_cidade as city_name
    FROM occurrences o
    LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
    LEFT JOIN cities c ON o.id_cidade = c.id_cidade
    ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `, [limit, offset], (err, rows) => {
    if (err) {
      console.error('Error fetching occurrences:', err.message);
      res.status(500).json({ message: 'error', error: err.message });
    } else {
      // Parse the JSON data for each occurrence
      const occurrences = rows.map(row => ({
        id_ocorrencia: row.id_ocorrencia,
        id_tp_emergencia: row.id_tp_emergencia,
        id_cidade: row.id_cidade,
        emergency_type_title: row.emergency_type_title,
        city_name: row.city_name,
        created_at: row.created_at,
        ts_ocorrencia: row.ts_ocorrencia,
        data: JSON.parse(row.data)
      }));
      res.json({ message: 'ok', data: occurrences, count: occurrences.length });
    }
  });
});

// Get occurrence by ID
app.get('/occurrences/:id', (req, res) => {
  const id = req.params.id;
  
  db.get('SELECT * FROM occurrences WHERE id_ocorrencia = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching occurrence:', err.message);
      res.status(500).json({ message: 'error', error: err.message });
    } else if (!row) {
      res.status(404).json({ message: 'error', error: 'Occurrence not found' });
    } else {
      res.json({ 
        message: 'ok', 
        data: {
          id_ocorrencia: row.id_ocorrencia,
          created_at: row.created_at,
          data: JSON.parse(row.data)
        }
      });
    }
  });
});

// Search occurrences by emergency type
app.get('/occurrences/emergency/:type', (req, res) => {
  const emergencyType = req.params.type;
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  
  db.all('SELECT * FROM occurrences ORDER BY created_at DESC LIMIT ? OFFSET ?', 
    [limit, offset], (err, rows) => {
    if (err) {
      console.error('Error fetching occurrences:', err.message);
      res.status(500).json({ message: 'error', error: err.message });
    } else {
      // Filter by emergency type
      const filteredOccurrences = rows
        .map(row => ({
          id_ocorrencia: row.id_ocorrencia,
          created_at: row.created_at,
          data: JSON.parse(row.data)
        }))
        .filter(occurrence => 
          occurrence.data.nm_tp_emergencia && 
          occurrence.data.nm_tp_emergencia.toLowerCase().includes(emergencyType.toLowerCase())
        );
      
      res.json({ 
        message: 'ok', 
        data: filteredOccurrences, 
        count: filteredOccurrences.length,
        searchTerm: emergencyType
      });
    }
  });
});

// Search occurrences by city
app.get('/occurrences/city/:city', (req, res) => {
  const city = req.params.city;
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  
  db.all('SELECT * FROM occurrences ORDER BY created_at DESC LIMIT ? OFFSET ?', 
    [limit, offset], (err, rows) => {
    if (err) {
      console.error('Error fetching occurrences:', err.message);
      res.status(500).json({ message: 'error', error: err.message });
    } else {
      // Filter by city
      const filteredOccurrences = rows
        .map(row => ({
          id_ocorrencia: row.id_ocorrencia,
          created_at: row.created_at,
          data: JSON.parse(row.data)
        }))
        .filter(occurrence => 
          occurrence.data.nm_cidade && 
          occurrence.data.nm_cidade.toLowerCase().includes(city.toLowerCase())
        );
      
      res.json({ 
        message: 'ok', 
        data: filteredOccurrences, 
        count: filteredOccurrences.length,
        searchTerm: city
      });
    }
  });
});

// Get emergency types
app.get('/emergency-types', (req, res) => {
  db.all('SELECT * FROM tp_emergencia ORDER BY id', [], (err, rows) => {
    if (err) {
      console.error('Error fetching emergency types:', err.message);
      res.status(500).json({ message: 'error', error: err.message });
    } else {
      res.json({ 
        message: 'ok', 
        data: rows
      });
    }
  });
});

// Get cities
app.get('/cities', (req, res) => {
  db.all('SELECT * FROM cities ORDER BY nome_cidade', [], (err, rows) => {
    if (err) {
      console.error('Error fetching cities:', err.message);
      res.status(500).json({ message: 'error', error: err.message });
    } else {
      res.json({ 
        message: 'ok', 
        data: rows
      });
    }
  });
});

// Get statistics
app.get('/occurrences/stats', (req, res) => {
  db.all('SELECT * FROM occurrences', [], (err, rows) => {
    if (err) {
      console.error('Error fetching statistics:', err.message);
      res.status(500).json({ message: 'error', error: err.message });
    } else {
      const occurrences = rows.map(row => JSON.parse(row.data));
      
      // Calculate statistics
      const stats = {
        total: occurrences.length,
        byEmergencyType: {},
        byCity: {},
        byDate: {}
      };
      
      occurrences.forEach(occurrence => {
        // Count by emergency type
        const emergencyType = occurrence.nm_tp_emergencia || 'Unknown';
        stats.byEmergencyType[emergencyType] = (stats.byEmergencyType[emergencyType] || 0) + 1;
        
        // Count by city
        const city = occurrence.nm_cidade || 'Unknown';
        stats.byCity[city] = (stats.byCity[city] || 0) + 1;
        
        // Count by date (YYYY-MM-DD)
        const date = occurrence.ts_ocorrencia ? 
          occurrence.ts_ocorrencia.split('T')[0] : 'Unknown';
        stats.byDate[date] = (stats.byDate[date] || 0) + 1;
      });
      
      res.json({ message: 'ok', data: stats });
    }
  });
});

// Delete occurrence by ID
app.delete('/occurrences/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM occurrences WHERE id_ocorrencia = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting occurrence:', err.message);
      res.status(500).json({ message: 'error', error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ message: 'error', error: 'Occurrence not found' });
    } else {
      res.json({ message: 'ok', deleted: id, changes: this.changes });
    }
  });
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running!', 
    endpoints: [
      '/readOccurrences',
      '/occurrences',
      '/occurrences/:id',
      '/occurrences/emergency/:type',
      '/occurrences/city/:city',
      '/emergency-types',
      '/cities',
      '/occurrences/stats'
    ] 
  });
});

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
