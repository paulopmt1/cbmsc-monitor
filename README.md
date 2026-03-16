# CBM SC Monitor

A Node.js API for monitoring emergency occurrences from the Santa Catarina Fire Department (CBM-SC). This application fetches, stores, and provides analytics for emergency incidents across Santa Catarina.

## 🚀 Features

- **Real-time Data Fetching**: Fetch emergency occurrences from CBM-SC API
- **Persistent Storage**: Store and query occurrence data with PostgreSQL (Neon)
- **Advanced Search**: Search by emergency type, city, and other criteria
- **Analytics**: Get comprehensive statistics and analytics
- **RESTful API**: Clean, well-documented API endpoints
- **Modular Architecture**: Organized, maintainable codebase

## 📋 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Neon Database account (for production)

### Installation & Setup

1. **Clone and install**:
```bash
git clone <your-repo-url>
cd cbmsc-monitor
npm install
```

2. **Environment setup**:
```bash
cp env.example .env
# Add your Neon DATABASE_URL to .env
```

3. **Start development server**:
```bash
# Run organized version (recommended)
node src/server.js

# Or run original version
node server-neon.js
```

The server will run on `http://localhost:3000`

## 🏗️ Project Architecture

### Organized Code Structure (Recommended)

The codebase has been reorganized into a modular structure for better maintainability:

```
src/
├── config/
│   └── database.js          # Database connection and initialization
├── middleware/
│   ├── cors.js             # CORS middleware
│   └── static.js           # Static file serving middleware
├── models/
│   └── data.js             # Data models and constants
├── routes/
│   ├── index.js            # Main routes index
│   ├── occurrences.js      # Occurrence-related routes
│   └── reference.js        # Reference data routes
├── utils/
│   └── initData.js         # Database initialization utilities
├── app.js                  # Main Express application setup
└── server.js               # Server entry point
```

### Benefits of This Organization

1. **Separation of Concerns**: Each file has a specific responsibility
2. **Maintainability**: Easier to find and modify specific functionality
3. **Scalability**: Easy to add new routes, middleware, or utilities
4. **Testability**: Individual modules can be tested in isolation
5. **Readability**: Code is organized logically and easy to navigate

## 🔌 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Server status and available endpoints |
| `GET` | `/api` | API information |
| `GET` | `/readOccurrences` | Fetch and store occurrences from CBM-SC API |

### Occurrences Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/occurrences` | Get all occurrences (with pagination) |
| `GET` | `/occurrences/:id` | Get specific occurrence by ID |
| `GET` | `/occurrences/emergency/:type` | Search by emergency type |
| `GET` | `/occurrences/city/:city` | Search by city |
| `GET` | `/occurrences/stats` | Get comprehensive statistics |
| `DELETE` | `/occurrences/:id` | Delete occurrence by ID |

### Reference Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/emergency-types` | Get all emergency types |
| `GET` | `/cities` | Get all cities |

### Query Parameters

- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

## 🗄️ Database Setup

### Neon Database (Recommended)

1. **Create a Neon account** at [https://neon.tech](https://neon.tech)
2. **Create a new project** in the Neon console
3. **Get your connection string** from the project dashboard
4. **Add to environment variables**:
   ```
   DATABASE_URL=postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### Database Schema

The application automatically creates these tables:
- `tp_emergencia`: Emergency types
- `cities`: City information
- `occurrences`: Main occurrence data with foreign keys

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Deploy**:
```bash
vercel login
vercel
vercel --prod
```

3. **Add environment variables** in Vercel dashboard:
   - `DATABASE_URL`: Your Neon connection string

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon Database connection string | Yes |
| `PORT` | Server port (default: 3000) | No |

## 📊 Usage Examples

### Fetch New Occurrences
```bash
curl https://your-app.vercel.app/readOccurrences
```

### Get All Occurrences with Pagination
```bash
curl "https://your-app.vercel.app/occurrences?limit=10&offset=0"
```

### Search by Emergency Type
```bash
curl https://your-app.vercel.app/occurrences/emergency/incendio
```

### Get Statistics
```bash
curl https://your-app.vercel.app/occurrences/stats
```

### Get Emergency Types
```bash
curl https://your-app.vercel.app/emergency-types
```

## 🤖 MCP Server (AI Integration)

This project includes an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that lets AI assistants like Cursor query occurrence data directly.

### Available Tools

| Tool | Description |
|------|-------------|
| `count_occurrences` | Count occurrences in a date range, with optional emergency type and city filters. Returns total + breakdown by type. |
| `list_occurrence_types` | List all emergency types with occurrence counts, optionally scoped to a period. |
| `get_occurrences` | Fetch actual occurrence records with type, city, timestamp, and coordinates. |
| `best_time_analysis` | Analyze distribution by day-of-week and hour-of-day to find the best time to witness occurrences. |
| `list_cities` | List all monitored cities with their total occurrence counts. |
| `fetch_new_occurrences` | Trigger a fresh pull of occurrences from the CBM-SC public API. |

### Setup in Cursor

There are two ways to connect: **remote** (recommended, no local setup) or **local**.

#### Option A: Remote (via Vercel)

The MCP server is deployed alongside the web app at `https://cbmsc-monitor.vercel.app/mcp`. No local installation needed.

Create `.cursor/mcp.json` in any Cursor workspace:
```json
{
  "mcpServers": {
    "cbmsc-monitor": {
      "url": "https://cbmsc-monitor.vercel.app/mcp"
    }
  }
}
```

#### Option B: Local (stdio)

1. **Install dependencies**:
```bash
cd mcp-server
npm install
```

2. Create `.cursor/mcp.json` in the project root:
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

The local server reads `DATABASE_URL` from the project's `.env` file automatically.

After configuring either option, **restart Cursor** (or reload the window) so it picks up the new MCP server.

### Example Questions You Can Ask

- "How many occurrences happened last month?"
- "What are the most common emergency types in Videira?"
- "What's the best day and time to go if I want to see more occurrences?"
- "Show me all fire incidents in Joaçaba this year"
- "Fetch new occurrences from the API"

### MCP Server Structure

```
mcp-server/
├── server.js          # Shared tool registration (used by both transports)
├── index.js           # Local entry point (stdio transport)
├── db.js              # Shared Neon PostgreSQL connection
├── package.json
└── tools/
    ├── analysis.js    # best_time_analysis
    ├── cities.js      # list_cities
    ├── count.js       # count_occurrences
    ├── fetch.js       # fetch_new_occurrences
    ├── occurrences.js # get_occurrences
    └── types.js       # list_occurrence_types

api/
└── mcp.js             # Vercel serverless function (Streamable HTTP transport)
```

## 🛠️ Development

### Adding New Features

1. **New Routes**: Add to appropriate route file in `src/routes/`
2. **New Middleware**: Add to `src/middleware/`
3. **New Models**: Add to `src/models/`
4. **New Utilities**: Add to `src/utils/`
5. **Database Changes**: Modify `src/config/database.js`

### Available Scripts

```bash
# Start development server (organized version)
node src/server.js

# Start original server
node server-neon.js

# Start with nodemon (if installed)
nodemon src/server.js
```

## 🏛️ Emergency Types

The system supports these emergency types:
- Acidente de Trânsito (Traffic Accident)
- Atendimento Pré-Hospitalar (Pre-Hospital Care)
- Auxílios/Apoios (Aid/Support)
- Averiguação/Corte de Árvore (Tree Investigation/Cutting)
- Averiguação/Manejo de Inseto (Insect Investigation/Management)
- Ação Preventiva Social (Social Preventive Action)
- Ações Preventivas (Preventive Actions)
- Diversos (Various)
- Incêndio (Fire)
- Produtos Perigosos (Dangerous Products)
- Risco Potencial (Potential Risk)
- Salvamento/Busca/Resgate (Rescue/Search/Rescue)

## 🛡️ Important Notes

- **Persistent Data**: Neon Database provides persistent PostgreSQL storage
- **Serverless Optimized**: Uses `@neondatabase/serverless` driver for Vercel
- **Free Tier**: Neon offers 3GB storage and 10GB transfer per month
- **Automatic Scaling**: Neon scales based on usage
- **Data Integrity**: Foreign key relationships ensure data consistency

## 🛠️ Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database (via Neon)
- **Axios** - HTTP client for API calls
- **Vercel** - Deployment platform
- **@neondatabase/serverless** - Serverless-optimized database driver
- **@modelcontextprotocol/sdk** - MCP server for AI assistant integration

## 📝 License

ISC

---

**Note**: This project has been reorganized for better maintainability. The original `server-neon.js` file is preserved for reference, but the new modular structure in `src/` is recommended for development and production use.
