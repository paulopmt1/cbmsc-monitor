const express = require('express');
const axios = require('axios');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// CORS middleware for Vercel
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

// In-memory storage for Vercel (since SQLite doesn't work well in serverless)
let occurrences = new Map();

// Initialize with sample data if empty
if (occurrences.size === 0) {
  const sampleOccurrence = {
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
  };
  
  occurrences.set(sampleOccurrence.id_ocorrencia, {
    id_ocorrencia: sampleOccurrence.id_ocorrencia,
    data: sampleOccurrence,
    created_at: new Date().toISOString()
  });
}

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
        if (!occurrences.has(occurrence.id_ocorrencia)) {
          // Save the object to in-memory storage
          occurrences.set(occurrence.id_ocorrencia, {
            id_ocorrencia: occurrence.id_ocorrencia,
            data: occurrence,
            created_at: new Date().toISOString()
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
  
  const occurrencesArray = Array.from(occurrences.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(offset, offset + limit);
  
  res.json({ 
    message: 'ok', 
    data: occurrencesArray, 
    count: occurrencesArray.length,
    total: occurrences.size
  });
});

// Get occurrence by ID
app.get('/occurrences/:id', (req, res) => {
  const id = req.params.id;
  const occurrence = occurrences.get(id);
  
  if (!occurrence) {
    res.status(404).json({ message: 'error', error: 'Occurrence not found' });
  } else {
    res.json({ message: 'ok', data: occurrence });
  }
});

// Search occurrences by emergency type
app.get('/occurrences/emergency/:type', (req, res) => {
  const emergencyType = req.params.type;
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  
  const filteredOccurrences = Array.from(occurrences.values())
    .filter(occurrence => 
      occurrence.data.nm_tp_emergencia && 
      occurrence.data.nm_tp_emergencia.toLowerCase().includes(emergencyType.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(offset, offset + limit);
  
  res.json({ 
    message: 'ok', 
    data: filteredOccurrences, 
    count: filteredOccurrences.length,
    searchTerm: emergencyType
  });
});

// Search occurrences by city
app.get('/occurrences/city/:city', (req, res) => {
  const city = req.params.city;
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  
  const filteredOccurrences = Array.from(occurrences.values())
    .filter(occurrence => 
      occurrence.data.nm_cidade && 
      occurrence.data.nm_cidade.toLowerCase().includes(city.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(offset, offset + limit);
  
  res.json({ 
    message: 'ok', 
    data: filteredOccurrences, 
    count: filteredOccurrences.length,
    searchTerm: city
  });
});

// Get statistics
app.get('/occurrences/stats', (req, res) => {
  const occurrencesArray = Array.from(occurrences.values());
  
  // Calculate statistics
  const stats = {
    total: occurrencesArray.length,
    byEmergencyType: {},
    byCity: {},
    byDate: {}
  };
  
  occurrencesArray.forEach(occurrence => {
    // Count by emergency type
    const emergencyType = occurrence.data.nm_tp_emergencia || 'Unknown';
    stats.byEmergencyType[emergencyType] = (stats.byEmergencyType[emergencyType] || 0) + 1;
    
    // Count by city
    const city = occurrence.data.nm_cidade || 'Unknown';
    stats.byCity[city] = (stats.byCity[city] || 0) + 1;
    
    // Count by date (YYYY-MM-DD)
    const date = occurrence.data.ts_ocorrencia ? 
      occurrence.data.ts_ocorrencia.split('T')[0] : 'Unknown';
    stats.byDate[date] = (stats.byDate[date] || 0) + 1;
  });
  
  res.json({ message: 'ok', data: stats });
});

// Delete occurrence by ID
app.delete('/occurrences/:id', (req, res) => {
  const id = req.params.id;
  
  if (occurrences.has(id)) {
    occurrences.delete(id);
    res.json({ message: 'ok', deleted: id });
  } else {
    res.status(404).json({ message: 'error', error: 'Occurrence not found' });
  }
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running on Vercel!', 
    endpoints: [
      '/readOccurrences',
      '/occurrences',
      '/occurrences/:id',
      '/occurrences/emergency/:type',
      '/occurrences/city/:city',
      '/occurrences/stats'
    ],
    note: 'This is a serverless version using in-memory storage'
  });
});

// Export for Vercel
module.exports = app; 