# CBM SC Monitor

A Node.js API for monitoring emergency occurrences from the Santa Catarina Fire Department (CBM-SC).

## Features

- Fetch emergency occurrences from CBM-SC API
- Store and query occurrence data
- Search by emergency type, city, and other criteria
- Get statistics and analytics
- RESTful API endpoints

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd cmbsc-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The server will run on `http://localhost:3000`

### Local Database

The local version uses SQLite for data persistence. The database file (`occurrences.db`) will be created automatically.

## API Endpoints

### Local Development (with SQLite)

- `GET /` - Server status and available endpoints
- `GET /readOccurrences` - Fetch and store occurrences from CBM-SC API
- `GET /occurrences` - Get all occurrences (with pagination)
- `GET /occurrences/:id` - Get specific occurrence by ID
- `GET /occurrences/emergency/:type` - Search by emergency type
- `GET /occurrences/city/:city` - Search by city
- `GET /occurrences/stats` - Get statistics
- `DELETE /occurrences/:id` - Delete occurrence by ID

### Vercel Deployment (In-Memory Storage)

The Vercel version uses in-memory storage since SQLite doesn't work well in serverless environments. Data will be reset on each deployment.

## Deployment to Vercel

### Prerequisites

- Vercel account
- Vercel CLI installed

### Deployment Steps

1. **Install Vercel CLI** (if not already installed):
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy the application**:
```bash
vercel
```

4. **Follow the prompts**:
   - Set up and deploy: `Y`
   - Which scope: Select your account
   - Link to existing project: `N`
   - Project name: `cmbsc-monitor` (or your preferred name)
   - Directory: `./` (current directory)
   - Override settings: `N`

5. **For production deployment**:
```bash
vercel --prod
```

### Environment Variables

No environment variables are required for basic functionality. The application will use default settings.

### Important Notes for Vercel Deployment

1. **Data Persistence**: The Vercel version uses in-memory storage, so data will be lost when the serverless function restarts.

2. **Cold Starts**: Serverless functions may have cold start delays on first request.

3. **Function Limits**: Vercel has execution time limits (10 seconds for hobby plan, 60 seconds for pro plan).

4. **Database Alternative**: For persistent data storage on Vercel, consider using:
   - Vercel KV (Redis)
   - Vercel Postgres
   - External database services (MongoDB Atlas, PlanetScale, etc.)

## Usage Examples

### Fetch New Occurrences
```bash
curl https://your-vercel-app.vercel.app/readOccurrences
```

### Get All Occurrences
```bash
curl https://your-vercel-app.vercel.app/occurrences
```

### Search by Emergency Type
```bash
curl https://your-vercel-app.vercel.app/occurrences/emergency/incendio
```

### Get Statistics
```bash
curl https://your-vercel-app.vercel.app/occurrences/stats
```

## Project Structure

```
cmbsc-monitor/
├── server.js              # Local development server (with SQLite)
├── server-vercel.js       # Vercel deployment server (in-memory)
├── vercel.json           # Vercel configuration
├── package.json          # Dependencies and scripts
├── occurrences.db        # SQLite database (local only)
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite3** - Local database (development)
- **Axios** - HTTP client for API calls
- **Vercel** - Deployment platform

## License

ISC
