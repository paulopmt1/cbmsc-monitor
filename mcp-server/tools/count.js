const { sql } = require('../db');

const definition = {
  name: 'count_occurrences',
  description:
    'Count emergency occurrences in a date range, optionally filtered by emergency type and/or city. ' +
    'Returns total count plus breakdown by emergency type.',
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
    },
    required: ['start_date', 'end_date'],
  },
};

async function handler({ start_date, end_date, emergency_type, city }) {
  const startDate = new Date(start_date);
  const endDate = new Date(end_date + 'T23:59:59');

  let totalResult;
  let breakdownResult;

  if (emergency_type && city) {
    totalResult = await sql`
      SELECT COUNT(*) as total
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
    `;
    breakdownResult = await sql`
      SELECT t.title as emergency_type, COUNT(*) as count
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      GROUP BY t.title
      ORDER BY count DESC
    `;
  } else if (emergency_type) {
    totalResult = await sql`
      SELECT COUNT(*) as total
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
    `;
    breakdownResult = await sql`
      SELECT t.title as emergency_type, COUNT(*) as count
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
      GROUP BY t.title
      ORDER BY count DESC
    `;
  } else if (city) {
    totalResult = await sql`
      SELECT COUNT(*) as total
      FROM occurrences o
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
    `;
    breakdownResult = await sql`
      SELECT t.title as emergency_type, COUNT(*) as count
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      GROUP BY t.title
      ORDER BY count DESC
    `;
  } else {
    totalResult = await sql`
      SELECT COUNT(*) as total
      FROM occurrences
      WHERE ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
    `;
    breakdownResult = await sql`
      SELECT t.title as emergency_type, COUNT(*) as count
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
      GROUP BY t.title
      ORDER BY count DESC
    `;
  }

  const total = parseInt(totalResult[0].total);
  const breakdown = breakdownResult.map((r) => ({
    type: r.emergency_type,
    count: parseInt(r.count),
  }));

  return {
    period: { start: start_date, end: end_date },
    total,
    by_type: breakdown,
  };
}

module.exports = { definition, handler };
