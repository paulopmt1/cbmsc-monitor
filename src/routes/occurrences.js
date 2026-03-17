const express = require('express');
const axios = require('axios');
const { sql } = require('../config/database');
const { emergencyTypes, cities, apiRequestData } = require('../models/data');

const router = express.Router();

// /readOccurrences endpoint
router.get('/readNewOccurrences', async (req, res) => {
  try {
    const response = await axios.post('https://api-gateway.cbm.sc.gov.br/cidadao/ocorrencias/listar/', apiRequestData);
    
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
          
          // Extract city ID and name from the occurrence data
          const cityId = parseInt(occurrence.id_cidade) || null;
          const cityName = occurrence.nm_cidade || null;
          
          // Handle city creation if it doesn't exist
          let finalCityId = cityId;
          if (cityId && cityName) {
            // Check if city exists in our cities table
            const existingCity = await sql`
              SELECT id_cidade FROM cities WHERE id_cidade = ${cityId}
            `;
            
            if (existingCity.length === 0) {
              // City doesn't exist, create it
              try {
                await sql`
                  INSERT INTO cities (id_cidade, nome_cidade) 
                  VALUES (${cityId}, ${cityName})
                  ON CONFLICT (id_cidade) DO NOTHING
                `;
                console.log(`Created new city: ${cityName} (ID: ${cityId})`);
              } catch (cityError) {
                console.error(`Error creating city ${cityName}:`, cityError.message);
                // Continue with the occurrence insertion even if city creation fails
              }
            }
          }
          
          // Extract GPS coordinates from the data
          const latitude = occurrence.lat_logradouro ? parseFloat(occurrence.lat_logradouro) : null;
          const longitude = occurrence.long_logradouro ? parseFloat(occurrence.long_logradouro) : null;
          
          const rawTs = occurrence.ts_ocorrencia;
          const occurrenceTimestamp = rawTs
            ? new Date(rawTs.replace(' ', 'T') + '-03:00')
            : new Date();
          
          // Save the object to database with foreign keys, GPS coordinates, and timestamp
          await sql`
            INSERT INTO occurrences (id_ocorrencia, id_tp_emergencia, id_cidade, lat_logradouro, long_logradouro, data, ts_ocorrencia) 
            VALUES (${occurrence.id_ocorrencia}, ${emergencyTypeId}, ${finalCityId}, ${latitude}, ${longitude}, ${occurrence}, ${occurrenceTimestamp})
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

// Get all occurrences with emergency type information (last 30 days only)
// Supports optional ?city= and ?emergency_type= query filters plus ?limit= and ?offset= pagination.
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(req.query.limit ? parseInt(req.query.limit) : 50, 200);
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const cityFilter = req.query.city ? `%${req.query.city}%` : null;
    const typeFilter = req.query.emergency_type ? `%${req.query.emergency_type}%` : null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const countResult = await sql`
      SELECT COUNT(*) FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia >= ${thirtyDaysAgo}
        AND (${cityFilter}::text IS NULL OR c.nome_cidade ILIKE ${cityFilter})
        AND (${typeFilter}::text IS NULL OR t.title ILIKE ${typeFilter})
    `;
    const total = parseInt(countResult[0].count);

    const result = await sql`
      SELECT o.id_ocorrencia, o.lat_logradouro, o.long_logradouro,
             o.created_at, o.ts_ocorrencia,
             o.data->>'de_inicial' as de_inicial,
             t.title as emergency_type_title, c.nome_cidade as city_name
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia >= ${thirtyDaysAgo}
        AND (${cityFilter}::text IS NULL OR c.nome_cidade ILIKE ${cityFilter})
        AND (${typeFilter}::text IS NULL OR t.title ILIKE ${typeFilter})
      ORDER BY o.ts_ocorrencia DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const occurrences = result.map(row => ({
      id_ocorrencia: row.id_ocorrencia,
      emergency_type_title: row.emergency_type_title,
      city_name: row.city_name,
      lat_logradouro: row.lat_logradouro,
      long_logradouro: row.long_logradouro,
      created_at: row.created_at,
      ts_ocorrencia: row.ts_ocorrencia,
      de_inicial: row.de_inicial || null,
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
router.get('/:id', async (req, res) => {
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
          de_inicial: occurrence.data?.de_inicial || null,
          data: occurrence.data
        }
      });
    }
  } catch (error) {
    console.error('Error fetching occurrence:', error.message);
    res.status(500).json({ message: 'error', error: error.message });
  }
});

// Search occurrences by emergency type (last 30 days only)
router.get('/emergency/:type', async (req, res) => {
  try {
    const emergencyType = req.params.type;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await sql`
      SELECT o.*, t.title as emergency_type_title, c.nome_cidade as city_name
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE t.title ILIKE ${`%${emergencyType}%`} AND o.ts_ocorrencia >= ${thirtyDaysAgo}
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
      de_inicial: row.data?.de_inicial || null,
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

// Search occurrences by city (last 30 days only)
router.get('/city/:city', async (req, res) => {
  try {
    const city = req.params.city;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await sql`
      SELECT o.*, t.title as emergency_type_title, c.nome_cidade as city_name
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE c.nome_cidade ILIKE ${`%${city}%`} AND o.ts_ocorrencia >= ${thirtyDaysAgo}
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
      de_inicial: row.data?.de_inicial || null,
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

// Get statistics (last 30 days only)
router.get('/stats', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total count (last 30 days)
    const totalResult = await sql`
      SELECT COUNT(*) FROM occurrences WHERE ts_ocorrencia >= ${thirtyDaysAgo}
    `;
    const total = parseInt(totalResult[0].count);

    // Get statistics by emergency type (last 30 days)
    const emergencyTypeResult = await sql`
      SELECT t.title as emergency_type, COUNT(o.id_ocorrencia) as count
      FROM tp_emergencia t
      LEFT JOIN occurrences o ON t.id = o.id_tp_emergencia AND o.ts_ocorrencia >= ${thirtyDaysAgo}
      GROUP BY t.id, t.title
      ORDER BY count DESC
    `;

    // Get statistics by city (last 30 days)
    const cityResult = await sql`
      SELECT c.nome_cidade as city, COUNT(o.id_ocorrencia) as count
      FROM cities c
      LEFT JOIN occurrences o ON c.id_cidade = o.id_cidade AND o.ts_ocorrencia >= ${thirtyDaysAgo}
      GROUP BY c.id_cidade, c.nome_cidade
      ORDER BY count DESC
    `;

    // Get statistics by date (last 30 days)
    const dateResult = await sql`
      SELECT DATE(ts_ocorrencia) as date, COUNT(*) as count
      FROM occurrences
      WHERE ts_ocorrencia >= ${thirtyDaysAgo}
      GROUP BY DATE(ts_ocorrencia)
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
router.delete('/:id', async (req, res) => {
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

module.exports = router; 