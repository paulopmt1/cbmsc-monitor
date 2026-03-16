const { sql } = require('../db');

const definition = {
  name: 'list_cities',
  description: 'List all monitored cities that have recorded occurrences.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

async function handler() {
  const result = await sql`
    SELECT c.id_cidade as id, c.nome_cidade as name, COUNT(o.id_ocorrencia)::int as occurrence_count
    FROM cities c
    LEFT JOIN occurrences o ON c.id_cidade = o.id_cidade
    GROUP BY c.id_cidade, c.nome_cidade
    ORDER BY c.nome_cidade
  `;

  return {
    cities: result.map((r) => ({
      id: r.id,
      name: r.name,
      occurrence_count: parseInt(r.occurrence_count),
    })),
  };
}

module.exports = { definition, handler };
