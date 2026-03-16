const { sql } = require('../db');

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const definition = {
  name: 'best_time_analysis',
  description:
    'Analyze occurrence distribution by day-of-week and hour-of-day to find the best time to go ' +
    'if you want to witness more occurrences. Returns rankings by day, by hour, and top day+hour ' +
    'combinations with a textual recommendation.',
  inputSchema: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description:
          'Start date in YYYY-MM-DD format. Defaults to 90 days ago if omitted.',
      },
      end_date: {
        type: 'string',
        description:
          'End date in YYYY-MM-DD format. Defaults to today if omitted.',
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
  },
};

async function handler({ start_date, end_date, emergency_type, city } = {}) {
  const endDate = end_date ? new Date(end_date + 'T23:59:59') : new Date();
  const startDate = start_date
    ? new Date(start_date)
    : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

  let byDayHour, byDay, byHour;

  if (emergency_type && city) {
    byDayHour = await sql`
      SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int AS dow,
             EXTRACT(HOUR FROM o.ts_ocorrencia)::int AS hour,
             COUNT(*)::int AS total
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      GROUP BY dow, hour ORDER BY total DESC
    `;
    byDay = await sql`
      SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int AS dow, COUNT(*)::int AS total
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      GROUP BY dow ORDER BY total DESC
    `;
    byHour = await sql`
      SELECT EXTRACT(HOUR FROM o.ts_ocorrencia)::int AS hour, COUNT(*)::int AS total
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      GROUP BY hour ORDER BY total DESC
    `;
  } else if (emergency_type) {
    byDayHour = await sql`
      SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int AS dow,
             EXTRACT(HOUR FROM o.ts_ocorrencia)::int AS hour,
             COUNT(*)::int AS total
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
      GROUP BY dow, hour ORDER BY total DESC
    `;
    byDay = await sql`
      SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int AS dow, COUNT(*)::int AS total
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
      GROUP BY dow ORDER BY total DESC
    `;
    byHour = await sql`
      SELECT EXTRACT(HOUR FROM o.ts_ocorrencia)::int AS hour, COUNT(*)::int AS total
      FROM occurrences o
      LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND t.title ILIKE ${'%' + emergency_type + '%'}
      GROUP BY hour ORDER BY total DESC
    `;
  } else if (city) {
    byDayHour = await sql`
      SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int AS dow,
             EXTRACT(HOUR FROM o.ts_ocorrencia)::int AS hour,
             COUNT(*)::int AS total
      FROM occurrences o
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      GROUP BY dow, hour ORDER BY total DESC
    `;
    byDay = await sql`
      SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int AS dow, COUNT(*)::int AS total
      FROM occurrences o
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      GROUP BY dow ORDER BY total DESC
    `;
    byHour = await sql`
      SELECT EXTRACT(HOUR FROM o.ts_ocorrencia)::int AS hour, COUNT(*)::int AS total
      FROM occurrences o
      LEFT JOIN cities c ON o.id_cidade = c.id_cidade
      WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
        AND c.nome_cidade ILIKE ${'%' + city + '%'}
      GROUP BY hour ORDER BY total DESC
    `;
  } else {
    byDayHour = await sql`
      SELECT EXTRACT(DOW FROM ts_ocorrencia)::int AS dow,
             EXTRACT(HOUR FROM ts_ocorrencia)::int AS hour,
             COUNT(*)::int AS total
      FROM occurrences
      WHERE ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
      GROUP BY dow, hour ORDER BY total DESC
    `;
    byDay = await sql`
      SELECT EXTRACT(DOW FROM ts_ocorrencia)::int AS dow, COUNT(*)::int AS total
      FROM occurrences
      WHERE ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
      GROUP BY dow ORDER BY total DESC
    `;
    byHour = await sql`
      SELECT EXTRACT(HOUR FROM ts_ocorrencia)::int AS hour, COUNT(*)::int AS total
      FROM occurrences
      WHERE ts_ocorrencia BETWEEN ${startDate} AND ${endDate}
      GROUP BY hour ORDER BY total DESC
    `;
  }

  const dayRanking = byDay.map((r) => ({
    day: DAY_NAMES[r.dow],
    occurrences: parseInt(r.total),
  }));

  const hourRanking = byHour.map((r) => ({
    hour: `${String(r.hour).padStart(2, '0')}:00`,
    occurrences: parseInt(r.total),
  }));

  const topCombinations = byDayHour.slice(0, 10).map((r) => ({
    day: DAY_NAMES[r.dow],
    hour: `${String(r.hour).padStart(2, '0')}:00`,
    occurrences: parseInt(r.total),
  }));

  const bestDay = dayRanking[0];
  const bestHour = hourRanking[0];
  const bestCombo = topCombinations[0];

  let recommendation = 'Not enough data to make a recommendation.';
  if (bestCombo) {
    recommendation =
      `Based on data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}: ` +
      `The single best time slot is ${bestCombo.day} at ${bestCombo.hour} (${bestCombo.occurrences} occurrences). ` +
      `Overall, ${bestDay.day} is the busiest day (${bestDay.occurrences} total) and ` +
      `${bestHour.hour} is the busiest hour across all days (${bestHour.occurrences} total).`;
  }

  return {
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    ranking_by_day: dayRanking,
    ranking_by_hour: hourRanking,
    top_day_hour_combinations: topCombinations,
    recommendation,
  };
}

module.exports = { definition, handler };
