const { generateText } = require('ai');
const { createAnthropic } = require('@ai-sdk/anthropic');
const { jsonSchema } = require('ai');
const { neon } = require('@neondatabase/serverless');

function getDb() {
  return neon(process.env.DATABASE_URL);
}

function buildSystemPrompt() {
  const today = new Date().toISOString().split('T')[0];
  return `Você é o assistente do CBM SC Monitor, um sistema que monitora ocorrências de emergência do Corpo de Bombeiros Militar de Santa Catarina.

Você tem acesso a ferramentas para consultar o banco de dados de ocorrências. SEMPRE use as ferramentas para buscar dados reais antes de responder — nunca invente números ou informações.

Data de hoje: ${today}.

Tipos de emergência monitorados: Acidente de Trânsito, Atendimento Pré-Hospitalar, Auxílios/Apoios, Averiguação/Corte de Árvore, Averiguação/Manejo de Inseto, Ação Preventiva Social, Ações Preventivas, Diversos, Incêndio, Produtos Perigosos, Risco Potencial, Salvamento/Busca/Resgate.

Responda sempre em Português (Brasil), a menos que o usuário escreva em outro idioma.
Seja conciso mas informativo. Use formatação markdown quando apropriado (listas, negrito, tabelas).`;
}

function withTimeout(fn, ms = 8000) {
  return (...args) =>
    Promise.race([
      fn(...args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timed out')), ms)
      ),
    ]);
}

async function countOccurrences({ start_date, end_date, emergency_type, city } = {}) {
  const sql = getDb();
  const startDate = new Date(start_date);
  const endDate = new Date(end_date + 'T23:59:59');
  if (emergency_type) {
    const totalResult = city
      ? await sql`SELECT COUNT(*) as total FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} AND t.title ILIKE ${'%' + emergency_type + '%'} AND c.nome_cidade ILIKE ${'%' + city + '%'}`
      : await sql`SELECT COUNT(*) as total FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} AND t.title ILIKE ${'%' + emergency_type + '%'}`;
    const breakdownResult = city
      ? await sql`SELECT t.title as emergency_type, COUNT(*) as count FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} AND t.title ILIKE ${'%' + emergency_type + '%'} AND c.nome_cidade ILIKE ${'%' + city + '%'} GROUP BY t.title ORDER BY count DESC`
      : await sql`SELECT t.title as emergency_type, COUNT(*) as count FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} AND t.title ILIKE ${'%' + emergency_type + '%'} GROUP BY t.title ORDER BY count DESC`;
    return { period: { start: start_date, end: end_date }, total: parseInt(totalResult[0].total), by_type: breakdownResult.map(r => ({ type: r.emergency_type, count: parseInt(r.count) })) };
  }
  const totalResult = city
    ? await sql`SELECT COUNT(*) as total FROM occurrences o LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} AND c.nome_cidade ILIKE ${'%' + city + '%'}`
    : await sql`SELECT COUNT(*) as total FROM occurrences WHERE ts_ocorrencia BETWEEN ${startDate} AND ${endDate}`;
  const breakdownResult = city
    ? await sql`SELECT t.title as emergency_type, COUNT(*) as count FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} AND c.nome_cidade ILIKE ${'%' + city + '%'} GROUP BY t.title ORDER BY count DESC`
    : await sql`SELECT t.title as emergency_type, COUNT(*) as count FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} GROUP BY t.title ORDER BY count DESC`;
  return { period: { start: start_date, end: end_date }, total: parseInt(totalResult[0].total), by_type: breakdownResult.map(r => ({ type: r.emergency_type, count: parseInt(r.count) })) };
}

async function listCities() {
  const sql = getDb();
  const result = await sql`
    SELECT c.id_cidade as id, c.nome_cidade as name, COUNT(o.id_ocorrencia)::int as occurrence_count
    FROM cities c LEFT JOIN occurrences o ON c.id_cidade = o.id_cidade
    GROUP BY c.id_cidade, c.nome_cidade ORDER BY c.nome_cidade
  `;
  return { cities: result.map(r => ({ id: r.id, name: r.name, occurrence_count: parseInt(r.occurrence_count) })) };
}

async function listTypes({ start_date, end_date } = {}) {
  const sql = getDb();
  const result = start_date && end_date
    ? await sql`SELECT t.title, COUNT(*)::int as count FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id WHERE o.ts_ocorrencia BETWEEN ${new Date(start_date)} AND ${new Date(end_date + 'T23:59:59')} GROUP BY t.title ORDER BY count DESC`
    : await sql`SELECT t.title, COUNT(*)::int as count FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id GROUP BY t.title ORDER BY count DESC`;
  return { types: result.map(r => ({ type: r.title, count: parseInt(r.count) })) };
}

async function getOccurrences({ start_date, end_date, emergency_type, city, limit = 50 } = {}) {
  const sql = getDb();
  const startDate = new Date(start_date);
  const endDate = new Date(end_date + 'T23:59:59');
  const lim = Math.min(limit || 50, 200);
  let rows;
  if (emergency_type && city) {
    rows = await sql`SELECT o.ts_ocorrencia, t.title as emergency_type, c.nome_cidade as city, o.latitude, o.longitude FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} AND t.title ILIKE ${'%' + emergency_type + '%'} AND c.nome_cidade ILIKE ${'%' + city + '%'} ORDER BY o.ts_ocorrencia DESC LIMIT ${lim}`;
  } else if (emergency_type) {
    rows = await sql`SELECT o.ts_ocorrencia, t.title as emergency_type, c.nome_cidade as city, o.latitude, o.longitude FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} AND t.title ILIKE ${'%' + emergency_type + '%'} ORDER BY o.ts_ocorrencia DESC LIMIT ${lim}`;
  } else if (city) {
    rows = await sql`SELECT o.ts_ocorrencia, t.title as emergency_type, c.nome_cidade as city, o.latitude, o.longitude FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} AND c.nome_cidade ILIKE ${'%' + city + '%'} ORDER BY o.ts_ocorrencia DESC LIMIT ${lim}`;
  } else {
    rows = await sql`SELECT o.ts_ocorrencia, t.title as emergency_type, c.nome_cidade as city, o.latitude, o.longitude FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${startDate} AND ${endDate} ORDER BY o.ts_ocorrencia DESC LIMIT ${lim}`;
  }
  return { count: rows.length, data: rows };
}

async function bestTimeAnalysis({ start_date, end_date, emergency_type, city } = {}) {
  const sql = getDb();
  const s = start_date ? new Date(start_date) : new Date(Date.now() - 90 * 86400000);
  const e = end_date ? new Date(end_date + 'T23:59:59') : new Date();
  let rows;
  if (emergency_type && city) {
    rows = await sql`SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int as dow, EXTRACT(HOUR FROM o.ts_ocorrencia)::int as hour, COUNT(*)::int as count FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${s} AND ${e} AND t.title ILIKE ${'%' + emergency_type + '%'} AND c.nome_cidade ILIKE ${'%' + city + '%'} GROUP BY dow, hour ORDER BY count DESC`;
  } else if (emergency_type) {
    rows = await sql`SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int as dow, EXTRACT(HOUR FROM o.ts_ocorrencia)::int as hour, COUNT(*)::int as count FROM occurrences o LEFT JOIN tp_emergencia t ON o.id_tp_emergencia = t.id WHERE o.ts_ocorrencia BETWEEN ${s} AND ${e} AND t.title ILIKE ${'%' + emergency_type + '%'} GROUP BY dow, hour ORDER BY count DESC`;
  } else if (city) {
    rows = await sql`SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int as dow, EXTRACT(HOUR FROM o.ts_ocorrencia)::int as hour, COUNT(*)::int as count FROM occurrences o LEFT JOIN cities c ON o.id_cidade = c.id_cidade WHERE o.ts_ocorrencia BETWEEN ${s} AND ${e} AND c.nome_cidade ILIKE ${'%' + city + '%'} GROUP BY dow, hour ORDER BY count DESC`;
  } else {
    rows = await sql`SELECT EXTRACT(DOW FROM o.ts_ocorrencia)::int as dow, EXTRACT(HOUR FROM o.ts_ocorrencia)::int as hour, COUNT(*)::int as count FROM occurrences o WHERE o.ts_ocorrencia BETWEEN ${s} AND ${e} GROUP BY dow, hour ORDER BY count DESC`;
  }
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return { top_combinations: rows.slice(0, 10).map(r => ({ day: days[r.dow], hour: `${r.hour}:00`, count: r.count })) };
}

const toolDefs = {
  count_occurrences: {
    description: 'Contar ocorrências de emergência em um período, com filtros opcionais por tipo e/ou cidade.',
    schema: { type: 'object', properties: { start_date: { type: 'string', description: 'Data início (YYYY-MM-DD)' }, end_date: { type: 'string', description: 'Data fim (YYYY-MM-DD)' }, emergency_type: { type: 'string', description: 'Tipo de emergência (busca parcial)' }, city: { type: 'string', description: 'Cidade (busca parcial)' } }, required: ['start_date', 'end_date'] },
    handler: withTimeout(countOccurrences),
  },
  list_occurrence_types: {
    description: 'Listar todos os tipos de emergência com contagem.',
    schema: { type: 'object', properties: { start_date: { type: 'string', description: 'Data início (YYYY-MM-DD)' }, end_date: { type: 'string', description: 'Data fim (YYYY-MM-DD)' } } },
    handler: withTimeout(listTypes),
  },
  get_occurrences: {
    description: 'Buscar registros individuais de ocorrências com detalhes.',
    schema: { type: 'object', properties: { start_date: { type: 'string', description: 'Data início (YYYY-MM-DD)' }, end_date: { type: 'string', description: 'Data fim (YYYY-MM-DD)' }, emergency_type: { type: 'string', description: 'Tipo de emergência (busca parcial)' }, city: { type: 'string', description: 'Cidade (busca parcial)' }, limit: { type: 'number', description: 'Máximo de registros (padrão: 50, máximo: 200)' } }, required: ['start_date', 'end_date'] },
    handler: withTimeout(getOccurrences),
  },
  best_time_analysis: {
    description: 'Analisar distribuição de ocorrências por dia da semana e hora do dia.',
    schema: { type: 'object', properties: { start_date: { type: 'string', description: 'Data início (YYYY-MM-DD)' }, end_date: { type: 'string', description: 'Data fim (YYYY-MM-DD)' }, emergency_type: { type: 'string', description: 'Tipo de emergência (busca parcial)' }, city: { type: 'string', description: 'Cidade (busca parcial)' } } },
    handler: withTimeout(bestTimeAnalysis),
  },
  list_cities: {
    description: 'Listar todas as cidades monitoradas com contagem de ocorrências.',
    schema: { type: 'object', properties: {} },
    handler: withTimeout(listCities),
  },
};

const anthropicTools = Object.entries(toolDefs).map(([name, def]) => ({
  name,
  description: def.description,
  input_schema: def.schema,
}));

async function callAnthropic(apiKey, messages) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: buildSystemPrompt(),
      messages,
      tools: anthropicTools,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${body}`);
  }
  return resp.json();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    return;
  }

  const { messages: chatHistory } = req.body || {};

  if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const messages = chatHistory.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let textResult = '';

    for (let step = 0; step < 5; step++) {
      const response = await callAnthropic(apiKey, messages);

      const textBlocks = response.content.filter((b) => b.type === 'text');
      const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

      if (textBlocks.length > 0) {
        textResult += textBlocks.map((b) => b.text).join('');
      }

      if (response.stop_reason !== 'tool_use' || toolBlocks.length === 0) {
        break;
      }

      const toolResults = [];
      for (const toolCall of toolBlocks) {
        const def = toolDefs[toolCall.name];
        if (!def) {
          toolResults.push({ type: 'tool_result', tool_use_id: toolCall.id, content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }) });
          continue;
        }
        try {
          const result = await def.handler(toolCall.input || {});
          toolResults.push({ type: 'tool_result', tool_use_id: toolCall.id, content: JSON.stringify(result) });
        } catch (err) {
          toolResults.push({ type: 'tool_result', tool_use_id: toolCall.id, content: JSON.stringify({ error: err.message }), is_error: true });
        }
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(textResult);
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
};
