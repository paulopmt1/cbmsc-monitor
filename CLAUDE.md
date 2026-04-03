# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CBM SC Monitor — a web app that fetches, stores, and visualizes emergency occurrences from the Santa Catarina Fire Department (CBM-SC). Deployed on Vercel with Neon PostgreSQL. The frontend is a single-page dashboard (`public/index.html`) with an AI-powered chat widget.

## Commands

```bash
# Run locally (Express server on port 3005)
node src/server.js

# Run with auto-reload
npm run dev          # uses nodemon via src/server.js

# Run tests
npm test             # Jest
npx jest src/utils/parseTimestamp.test.js   # single test file

# CORS proxy for local LLM (LM Studio)
npm run proxy        # localhost:5002 → localhost:1234

# Deploy
vercel --prod
```

## Environment Variables

Defined in `.env` (see `env.example`):
- `DATABASE_URL` (required) — Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` — needed for AI chat
- `PORT` — defaults to 3005

## Architecture

The app has two parallel runtime contexts that share the same database:

### 1. Express Server (`src/`)
The traditional Node.js server used for local development and as a Vercel catch-all function:
- **Entry** (dev): `src/server.js` → `src/app.js`
- **Routes** (`src/routes/`): `occurrences.js` (CRUD + ingestion from CBM-SC API), `reference.js` (emergency-types, cities), `export.js` (SQL dump), `logs.js` (access logging)
- **Database**: `src/config/database.js` — Neon serverless client, creates tables on startup
- **Seed data**: `src/models/data.js` defines emergency types and city IDs; `src/utils/initData.js` inserts them on boot

### 2. Vercel Serverless Functions (`api/`)
Standalone functions that bypass the Express app:
- `api/chat.js` — AI chat endpoint using Anthropic Messages API with tool-use loop (up to 5 tool-call rounds)
- `api/chat-tools.js` — direct tool execution endpoint
- `api/mcp.js` — MCP HTTP transport using StreamableHTTPServerTransport
- `api/log.js` — access log endpoint
- `api/lib/tools.js` — **shared tool definitions** used by both `chat.js` and `chat-tools.js`. Contains SQL queries, system prompts (PT-BR and EN), and an 8-second timeout wrapper.

### 3. MCP Server (`mcp-server/`)
Model Context Protocol server with tool implementations in `mcp-server/tools/`. Used in two modes:
- **stdio** (`mcp-server/index.js`) — for local AI editors like Cursor
- **HTTP** (via `api/mcp.js`) — for remote MCP clients

Tool implementations in `mcp-server/tools/` mirror the queries in `api/lib/tools.js` but are structured for the MCP SDK.

### Tool Duplication
There are **two parallel sets of tool implementations**: `api/lib/tools.js` (for the chat endpoints) and `mcp-server/tools/` (for the MCP server). Both query the same database with similar logic. Changes to query logic should be applied in both places.

### Database Schema
Three main tables plus an access log:
- `tp_emergencia(id, title)` — emergency type lookup
- `cities(id_cidade, nome_cidade)` — city lookup
- `occurrences(id_ocorrencia, id_tp_emergencia, id_cidade, lat_logradouro, long_logradouro, data JSONB, ts_ocorrencia)` — the `data` column stores the full raw JSON from the CBM-SC API
- `access_logs(id, user_name, action, success, details JSONB, ip_address, user_agent)` — user activity tracking

### Vercel Routing (`vercel.json`)
Specific paths (`/mcp`, `/api/chat`, `/api/chat-tools`, `/api/log`) route to their respective serverless functions. Everything else falls through to `api/index.js` (the Express app).

## Key Patterns

- **Neon serverless client**: Uses tagged template literals (`sql\`SELECT ...\``) — NOT a query string API. Parameters are interpolated safely via template syntax.
- **CBM-SC API ingestion**: `src/routes/occurrences.js#readNewOccurrences` POSTs to the external CBM-SC gateway, creates cities on-the-fly if not in the database, and deduplicates by `id_ocorrencia`.
- **Timestamps**: The CBM-SC API sends timestamps like `"2026-03-16 14:30:00"` (no timezone). `src/utils/parseTimestamp.js` converts these assuming BRT (-03:00) and falls back to `new Date()` for invalid input.
- **Frontend**: Single HTML file (`public/index.html`) — all JS/CSS is inline. Contains the dashboard, filters, infinite scroll, and the AI chat widget with i18n (PT-BR/EN).
