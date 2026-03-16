const { sql } = require('../db');

const definition = {
  name: 'get_occurrences',
  description:
    'Fetch actual occurrence records with details (type, city, timestamp, coordinates). ' +
    'Supports filtering by date range, emergency type, and city.',
  inputSchema: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: 'Start date (inclusive) in YYYY-MM-DD format',
      },
      end_date: {
        type: 'string',
        description: 'End date (inclusive) in YYYY-MM-DD format',
      },
      emergency_type: {
        type: 'string',
        description: 'Filter by emergency type name (partial match, case-insensitive)',
      },
      city: {
        type: 'string',
        description: 'Filter by city name (partial match, case-insensitive)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of records to return (default: 50, max: 200)',
      },
    },
    required: ['start_date', 'end_date'],
  },
};

async function handler({ start_date, end_date, emergency_type, city, limit }) {
  const startDate = new Date(start_date);
  const endDate = new Date(end_date + 'T23:59:59');
  const maxRows = Math.min(limit || 50, 200);

  let result;

  if (emergency_type && city) {
    result = await sql`
      SELECT o.id_ocorrencia, t.title as emergency_type, c.nome_cidade as city,
             o.lat_logradouro, o.long_logradouro, o.ts_ocorrencia,
             o.data->>'de_inicial' as description
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      ORDER BY o.ts_ocorrencia DESC
      LIMIT ${maxRows}
    `;
  } else if (emergency_type) {
    result = await sql`
      SELECT o.id_ocorrencia, t.title as emergency_type, c.nome_cidade as city,
             o.lat_logradouro, o.long_logradouro, o.ts_ocorrencia,
             o.data->>'de_inicial' as description
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
      ORDER BY o.ts_ocorrencia DESC
      LIMIT ${maxRows}
    `;
  } else if (city) {
    result = await sql`
      SELECT o.id_ocorrencia, t.title as emergency_type, c.nome_cidade as city,
             o.lat_logradouro, o.long_logradouro, o.ts_ocorrencia,
             o.data->>'de_inicial' as description
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      ORDER BY o.ts_ocorrencia DESC
      LIMIT ${maxRows}
    `;
  } else {
    result = await sql`
      SELECT o.id_ocorrencia, t.title as emergency_type, c.nome_cidade as city,
             o.lat_logradouro, o.long_logradouro, o.ts_ocorrencia,
             o.data->>'de_inicial' as description
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
      ORDER BY o.ts_ocorrencia DESC
      LIMIT ${maxRows}
    `;
  }

  return {
    period: { start: start_date, end: end_date },
    count: result.length,
    occurrences: result.map((r) => ({
      id: r.id_ocorrencia,
      type: r.emergency_type,
      city: r.city,
      lat: r.lat_logradouro,
      lng: r.long_logradouro,
      timestamp: r.ts_ocorrencia,
      description: r.description,
    })),
  };
}

module.exports = { definition, handler };
