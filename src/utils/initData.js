const { sql } = require('../config/database');
const { emergencyTypes, cities } = require('../models/data');

// Initialize database with emergency types and cities
async function initializeData() {
  try {
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
    
    console.log('Initial data (emergency types and cities) inserted successfully');
  } catch (error) {
    console.error('Error inserting initial data:', error);
  }
}

module.exports = {
  initializeData
}; 