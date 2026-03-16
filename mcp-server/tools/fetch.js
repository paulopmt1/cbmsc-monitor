const axios = require('axios');
const { sql } = require('../db');

const emergencyTypes = [
  { id: 8, title: 'Acidente de Trânsito' },
  { id: 5, title: 'Atendimento Pré-Hospitalar' },
  { id: 2, title: 'Auxílios/Apoios' },
  { id: 10, title: 'Averiguação/Corte de Árvore' },
  { id: 11, title: 'Averiguação/Manejo de Inseto' },
  { id: 12, title: 'Ação Preventiva Social' },
  { id: 9, title: 'Ações Preventivas' },
  { id: 7, title: 'Diversos' },
  { id: 1, title: 'Incêndio' },
  { id: 3, title: 'Produtos Perigosos' },
  { id: 13, title: 'Risco Potencial' },
  { id: 4, title: 'Salvamento/Busca/Resgate' },
];

const apiRequestData = {
  user: {
    cidade: [8031, 8107, 8131, 9229, 8177, 8255, 8303, 8353, 8379],
  },
  emergencies: emergencyTypes.map((type) => ({ ...type, choosed: 1 })),
};

const definition = {
  name: 'fetch_new_occurrences',
  description:
    'Trigger a fetch of new occurrences from the CBM-SC public API and store them in the database. ' +
    'Returns how many were saved vs skipped (already existed).',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

async function handler() {
  const response = await axios.post(
    'https://api-gateway.cbm.sc.gov.br/cidadao/ocorrencias/listar/',
    apiRequestData
  );

  if (!response.data?.data || !Array.isArray(response.data.data)) {
    return { saved: 0, skipped: 0, total_processed: 0, note: 'No data returned from API' };
  }

  let savedCount = 0;
  let skippedCount = 0;

  for (const occurrence of response.data.data) {
    const existing = await sql`
      SELECT id_ocorrencia FROM occurrences WHERE id_ocorrencia = ${occurrence.id_ocorrencia}
    `;

    if (existing.length > 0) {
      skippedCount++;
      continue;
    }

    const cityId = parseInt(occurrence.id_cidade) || null;
    const cityName = occurrence.nm_cidade || null;

    if (cityId && cityName) {
      const existingCity = await sql`SELECT id_cidade FROM cities WHERE id_cidade = ${cityId}`;
      if (existingCity.length === 0) {
        try {
          await sql`
            INSERT INTO cities (id_cidade, nome_cidade)
            VALUES (${cityId}, ${cityName})
            ON CONFLICT (id_cidade) DO NOTHING
          `;
        } catch (_) {
          // city insertion failed, continue anyway
        }
      }
    }

    const emergencyTypeId = parseInt(occurrence.id_tp_emergencia) || null;
    const latitude = occurrence.lat_logradouro ? parseFloat(occurrence.lat_logradouro) : null;
    const longitude = occurrence.long_logradouro ? parseFloat(occurrence.long_logradouro) : null;
    const occurrenceTimestamp = occurrence.ts_ocorrencia
      ? new Date(occurrence.ts_ocorrencia)
      : new Date();

    await sql`
      INSERT INTO occurrences (id_ocorrencia, id_tp_emergencia, id_cidade, lat_logradouro, long_logradouro, data, ts_ocorrencia)
      VALUES (${occurrence.id_ocorrencia}, ${emergencyTypeId}, ${cityId}, ${latitude}, ${longitude}, ${occurrence}, ${occurrenceTimestamp})
    `;
    savedCount++;
  }

  return {
    saved: savedCount,
    skipped: skippedCount,
    total_processed: response.data.data.length,
  };
}

module.exports = { definition, handler };
