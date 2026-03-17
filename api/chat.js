const { streamText } = require('ai');
const { createAnthropic } = require('@ai-sdk/anthropic');
const { z } = require('zod');

const { handler: countHandler } = require('../mcp-server/tools/count');
const { handler: typesHandler } = require('../mcp-server/tools/types');
const { handler: occurrencesHandler } = require('../mcp-server/tools/occurrences');
const { handler: analysisHandler } = require('../mcp-server/tools/analysis');
const { handler: citiesHandler } = require('../mcp-server/tools/cities');

function buildSystemPrompt() {
  const today = new Date().toISOString().split('T')[0];
  return `Você é o assistente do CBM SC Monitor, um sistema que monitora ocorrências de emergência do Corpo de Bombeiros Militar de Santa Catarina.

Você tem acesso a ferramentas para consultar o banco de dados de ocorrências. SEMPRE use as ferramentas para buscar dados reais antes de responder — nunca invente números ou informações.

Data de hoje: ${today}.

Tipos de emergência monitorados: Acidente de Trânsito, Atendimento Pré-Hospitalar, Auxílios/Apoios, Averiguação/Corte de Árvore, Averiguação/Manejo de Inseto, Ação Preventiva Social, Ações Preventivas, Diversos, Incêndio, Produtos Perigosos, Risco Potencial, Salvamento/Busca/Resgate.

Responda sempre em Português (Brasil), a menos que o usuário escreva em outro idioma.
Seja conciso mas informativo. Use formatação markdown quando apropriado (listas, negrito, tabelas).`;
}

// Workaround for AI SDK v6 bug (#13460): tool() stores schemas on .parameters
// but the SDK reads .inputSchema. Define tools as plain objects with inputSchema.
const chatTools = {
  count_occurrences: {
    description:
      'Contar ocorrências de emergência em um período, com filtros opcionais por tipo e/ou cidade. Retorna total e breakdown por tipo.',
    inputSchema: z.object({
      start_date: z.string().describe('Data início (YYYY-MM-DD)'),
      end_date: z.string().describe('Data fim (YYYY-MM-DD)'),
      emergency_type: z
        .string()
        .optional()
        .describe('Tipo de emergência (busca parcial, case-insensitive)'),
      city: z
        .string()
        .optional()
        .describe('Nome da cidade (busca parcial, case-insensitive)'),
    }),
    execute: async (params) => countHandler(params),
  },

  list_occurrence_types: {
    description:
      'Listar todos os tipos de emergência com contagem de ocorrências. Pode ser filtrado por período.',
    inputSchema: z.object({
      start_date: z.string().optional().describe('Data início (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('Data fim (YYYY-MM-DD)'),
    }),
    execute: async (params) => typesHandler(params),
  },

  get_occurrences: {
    description:
      'Buscar registros individuais de ocorrências com detalhes: tipo, cidade, data/hora, coordenadas GPS, descrição.',
    inputSchema: z.object({
      start_date: z.string().describe('Data início (YYYY-MM-DD)'),
      end_date: z.string().describe('Data fim (YYYY-MM-DD)'),
      emergency_type: z
        .string()
        .optional()
        .describe('Tipo de emergência (busca parcial)'),
      city: z.string().optional().describe('Nome da cidade (busca parcial)'),
      limit: z
        .number()
        .optional()
        .describe('Máximo de registros (padrão: 50, máximo: 200)'),
    }),
    execute: async (params) => occurrencesHandler(params),
  },

  best_time_analysis: {
    description:
      'Analisar distribuição de ocorrências por dia da semana e hora do dia. Identifica horários e dias de pico.',
    inputSchema: z.object({
      start_date: z.string().optional().describe('Data início (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('Data fim (YYYY-MM-DD)'),
      emergency_type: z
        .string()
        .optional()
        .describe('Tipo de emergência (busca parcial)'),
      city: z.string().optional().describe('Nome da cidade (busca parcial)'),
    }),
    execute: async (params) => analysisHandler(params),
  },

  list_cities: {
    description:
      'Listar todas as cidades monitoradas com a contagem total de ocorrências de cada uma.',
    inputSchema: z.object({}),
    execute: async () => citiesHandler(),
  },
};

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

  const { messages } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  try {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: buildSystemPrompt(),
      messages: messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools: chatTools,
      maxSteps: 5,
      onError({ error }) {
        console.error('streamText error:', error);
      },
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const debugEvents = [];
    for await (const part of result.fullStream) {
      debugEvents.push(part.type);
      if (part.type === 'text-delta') {
        res.write(part.text);
      } else if (part.type === 'error') {
        const msg = part.error?.message || JSON.stringify(part.error, Object.getOwnPropertyNames(part.error || {}));
        res.write(`\n[ERROR: ${msg}]`);
      } else if (part.type === 'tool-call') {
        res.write(`\n[TOOL_CALL: ${part.toolName} ${JSON.stringify(part.args)}]`);
      } else if (part.type === 'tool-result') {
        res.write(`\n[TOOL_RESULT: ${part.toolName}]`);
      } else if (part.type === 'tool-error') {
        res.write(`\n[TOOL_ERROR: ${JSON.stringify(part)}]`);
      }
    }
    if (debugEvents.length === 0) {
      res.write('[NO EVENTS IN STREAM]');
    } else {
      res.write(`\n[EVENTS: ${debugEvents.join(',')}]`);
    }
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
