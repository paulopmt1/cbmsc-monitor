const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { createServer } = require('./server');

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
