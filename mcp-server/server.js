const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const { handler: countHandler } = require('./tools/count');
const { handler: typesHandler } = require('./tools/types');
const { handler: occurrencesHandler } = require('./tools/occurrences');
const { handler: analysisHandler } = require('./tools/analysis');
const { handler: citiesHandler } = require('./tools/cities');
const { handler: fetchHandler } = require('./tools/fetch');

function wrapHandler(fn) {
  return async (params) => {
    try {
      const result = await fn(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  };
}

function createServer() {
  const server = new McpServer({
    name: 'cbmsc-monitor',
    version: '1.0.0',
  });

  server.tool(
    'count_occurrences',
    'Count emergency occurrences in a date range, optionally filtered by emergency type and/or city. Returns total count plus breakdown by emergency type.',
    {
      start_date: z.string().describe('Start date (inclusive) in YYYY-MM-DD format'),
      end_date: z.string().describe('End date (inclusive) in YYYY-MM-DD format'),
      emergency_type: z.string().optional().describe('Filter by emergency type name (partial match, case-insensitive)'),
      city: z.string().optional().describe('Filter by city name (partial match, case-insensitive)'),
    },
    wrapHandler(countHandler)
  );

  server.tool(
    'list_occurrence_types',
    'List all emergency types with their occurrence counts. Optionally filtered to a date range. Returns types sorted by count descending.',
    {
      start_date: z.string().optional().describe('Start date (inclusive) in YYYY-MM-DD format. If omitted, counts all time.'),
      end_date: z.string().optional().describe('End date (inclusive) in YYYY-MM-DD format. If omitted, counts all time.'),
    },
    wrapHandler(typesHandler)
  );

  server.tool(
    'get_occurrences',
    'Fetch actual occurrence records with details (type, city, timestamp, coordinates). Supports filtering by date range, emergency type, and city.',
    {
      start_date: z.string().describe('Start date (inclusive) in YYYY-MM-DD format'),
      end_date: z.string().describe('End date (inclusive) in YYYY-MM-DD format'),
      emergency_type: z.string().optional().describe('Filter by emergency type name (partial match, case-insensitive)'),
      city: z.string().optional().describe('Filter by city name (partial match, case-insensitive)'),
      limit: z.number().optional().describe('Maximum number of records to return (default: 50, max: 200)'),
    },
    wrapHandler(occurrencesHandler)
  );

  server.tool(
    'best_time_analysis',
    'Analyze occurrence distribution by day-of-week and hour-of-day to find the best time to go if you want to witness more occurrences. Returns rankings by day, by hour, and top day+hour combinations with a textual recommendation.',
    {
      start_date: z.string().optional().describe('Start date in YYYY-MM-DD format. Defaults to 90 days ago if omitted.'),
      end_date: z.string().optional().describe('End date in YYYY-MM-DD format. Defaults to today if omitted.'),
      emergency_type: z.string().optional().describe('Filter by emergency type name (partial match, case-insensitive)'),
      city: z.string().optional().describe('Filter by city name (partial match, case-insensitive)'),
    },
    wrapHandler(analysisHandler)
  );

  server.tool(
    'list_cities',
    'List all monitored cities that have recorded occurrences.',
    {},
    wrapHandler(citiesHandler)
  );

  server.tool(
    'fetch_new_occurrences',
    'Trigger a fetch of new occurrences from the CBM-SC public API and store them in the database. Returns how many were saved vs skipped (already existed).',
    {},
    wrapHandler(fetchHandler)
  );

  return server;
}

module.exports = { createServer };
