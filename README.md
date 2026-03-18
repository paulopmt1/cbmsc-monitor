# CBM SC Monitor

A web application for monitoring emergency occurrences from the Santa Catarina Fire Department (CBM-SC). Fetches, stores, and visualizes emergency incidents across Santa Catarina with an interactive dashboard and AI-powered chat.

<img width="1714" height="1338" alt="image" src="https://github.com/user-attachments/assets/6368fe3a-3927-4011-9a18-35ef3733c2fd" />

## Features

- **Interactive Dashboard**: Occurrence cards with filters by city and emergency type, stats overview, infinite scroll, and GPS links to Google Maps
- **AI Chat**: Floating chat widget powered by Anthropic Claude Haiku (or local LLM via LM Studio) that can query occurrence data using tool calls
- **MCP Server**: [Model Context Protocol](https://modelcontextprotocol.io/) integration letting AI assistants like Cursor query the data directly
- **Internationalization**: Full PT-BR and EN support
- **RESTful API**: Endpoints for occurrences, stats, reference data, and database export
- **Real-time Ingestion**: Fetch and store new occurrences from the CBM-SC public API on demand
- **Serverless Deployment**: Runs on Vercel with Neon PostgreSQL

## Quick Start

### Prerequisites
- Node.js v14+
- Neon Database account ([neon.tech](https://neon.tech))

### Setup

```bash
git clone <your-repo-url>
cd cbmsc-monitor
npm install
cp env.example .env
# Add your DATABASE_URL to .env
node src/server.js
```

The server runs on `http://localhost:3000`.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key (for AI chat) | No |
| `PORT` | Server port (default: 3000) | No |

## API Endpoints

### Occurrences

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/occurrences` | List occurrences (last 30 days). Filters: `?city=`, `?emergency_type=`, `?limit=`, `?offset=` |
| `GET` | `/occurrences/:id` | Get occurrence by ID |
| `GET` | `/occurrences/emergency/:type` | Search by emergency type |
| `GET` | `/occurrences/city/:city` | Search by city |
| `GET` | `/occurrences/stats` | Stats breakdown by type, city, and date |
| `GET` | `/occurrences/readNewOccurrences` | Fetch new occurrences from CBM-SC API |
| `DELETE` | `/occurrences/:id` | Delete occurrence |

### Reference & Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/emergency-types` | List all emergency types |
| `GET` | `/cities` | List all cities |
| `GET` | `/export-db` | MySQL-compatible SQL dump |

### AI Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Chat with AI assistant (body: `{ messages, lang }`) |
| `POST` | `/api/chat-tools` | Execute tool calls (body: `{ calls: [{ name, args }] }`) |

## MCP Server (AI Integration)

The MCP server lets AI assistants query occurrence data directly. Available tools:

| Tool | Description |
|------|-------------|
| `count_occurrences` | Count occurrences in a date range with optional filters |
| `list_occurrence_types` | List emergency types with counts |
| `get_occurrences` | Fetch occurrence records with details |
| `best_time_analysis` | Day/hour distribution analysis |
| `list_cities` | List monitored cities |
| `fetch_new_occurrences` | Pull new occurrences from CBM-SC API |

### Setup in Cursor

**Remote (recommended)** — no local setup needed:

```json
{
  "mcpServers": {
    "cbmsc-monitor": {
      "url": "https://cbmsc-monitor.vercel.app/mcp"
    }
  }
}
```

**Local (stdio)**:

```json
{
  "mcpServers": {
    "cbmsc-monitor": {
      "command": "node",
      "args": ["<absolute-path-to>/cbmsc-monitor/mcp-server/index.js"]
    }
  }
}
```

Save as `.cursor/mcp.json` and restart Cursor.

## Local LLM Support

The chat widget supports local LLMs via LM Studio. A CORS proxy is included:

```bash
npm run proxy
# Proxies localhost:5001 → localhost:1234 (LM Studio default)
# Options: --port <port> --target <url>
```

Configure the local URL in the chat widget settings panel:

<img width="494" height="346" alt="image" src="https://github.com/user-attachments/assets/c46f56ba-29ad-4756-8fdf-baab0f778f51" />


## Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
```

Add `DATABASE_URL` and `ANTHROPIC_API_KEY` in the Vercel dashboard.

## Project Structure

```
src/                    # Express app (modular structure)
├── config/database.js  # DB connection and schema init
├── routes/             # occurrences, reference, export
├── middleware/          # CORS, static files
├── models/data.js      # Constants and seed data
└── server.js           # Entry point

api/                    # Vercel serverless functions
├── chat.js             # AI chat endpoint
├── chat-tools.js       # Tool execution endpoint
└── mcp.js              # MCP HTTP transport

mcp-server/             # MCP server (shared tools)
├── server.js           # Tool registration
├── index.js            # stdio entry point
├── db.js               # Neon connection
└── tools/              # Tool implementations

public/index.html       # Dashboard SPA
```

## Tech Stack

Node.js, Express, PostgreSQL (Neon), Anthropic Claude Haiku, MCP SDK, Vercel, Axios

## License

ISC
