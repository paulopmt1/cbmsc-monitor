const { sql } = require('../db');

const definition = {
  name: 'list_occurrence_types',
  description:
    'List all emergency types with their occurrence counts. ' +
    'Optionally filtered to a date range. Returns types sorted by count descending.',
  inputSchema: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: 'Start date (inclusive) in YYYY-MM-DD format. If omitted, counts all time.',
      },
      end_date: {
        type: 'string',
        description: 'End date (inclusive) in YYYY-MM-DD format. If omitted, counts all time.',
      },
    },
  },
};

async function handler({ start_date, end_date } = {}) {
  let result;

  if (start_date && end_date) {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date + 'T23:59:59');
    result = await sql`
      SELECT t.id, t.title as type, COUNT(o.id_ocorrencia) as count
      FROM tp_emergencia t
      LEFT JOIN occurrences o ON t.id = o.id_tp_emergencia
        AND o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
      GROUP BY t.id, t.title
      ORDER BY count DESC
    `;
  } else {
    result = await sql`
      SELECT t.id, t.title as type, COUNT(o.id_ocorrencia) as count
      FROM tp_emergencia t
      LEFT JOIN occurrences o ON t.id = o.id_tp_emergencia
      GROUP BY t.id, t.title
      ORDER BY count DESC
    `;
  }

  return {
    period: start_date && end_date ? { start: start_date, end: end_date } : 'all_time',
    types: result.map((r) => ({
      id: r.id,
      type: r.type,
      count: parseInt(r.count),
    })),
  };
}

module.exports = { definition, handler };
