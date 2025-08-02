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
    // Create table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS occurrences (
      id_ocorrencia TEXT PRIMARY KEY,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
          // Save the object to database
          await new Promise((resolve, reject) => {
            db.run('INSERT INTO occurrences (id_ocorrencia, data) VALUES (?, ?)', 
              [occurrence.id_ocorrencia, JSON.stringify(occurrence)], (err) => {
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

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!', endpoints: ['/readOccurrences'] });
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


/**
 * {
    "error": false,
    "data": [
        {
            "id_ocorrencia": "130791655",
            "id_cidade": "8379",
            "id_tp_emergencia": "8",
            "de_inicial": "acidente de trânsito  colisão moto x caminhão",
            "ts_ocorrencia": "2025-07-30T18:07:57.837Z",
            "nm_logradouro_prv": "Rodovia 453",
            "nm_bairro_prv": "20000157",
            "nr_edificacao": "6770",
            "nm_cidade": "VIDEIRA",
            "nm_tp_emergencia": "ACIDENTE DE TRÂNSITO",
            "time": "18:07",
            "lat_logradouro": -26.9987074,
            "long_logradouro": -51.1166335,
            "viaturas": "ASU-517, ABTR-120, "
        }
    ]
}
 */