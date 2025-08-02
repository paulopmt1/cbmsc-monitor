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

## Deployment to Vercel with Neon Database

### Prerequisites

- Vercel account
- Vercel CLI installed
- Neon Database account (free tier available)

### Setup Neon Database

1. **Create a Neon account** at [https://neon.tech](https://neon.tech)

2. **Create a new project** in the Neon console

3. **Get your connection string** from the project dashboard

4. **Copy the connection string** - it looks like:
   ```
   postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

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

5. **Add environment variables** in Vercel dashboard:
   - Go to your project settings
   - Add `DATABASE_URL` with your Neon connection string

6. **For production deployment**:
```bash
vercel --prod
```

### Environment Variables

Required environment variable:
- `DATABASE_URL`: Your Neon Database connection string

### Local Development with Neon

1. **Copy the environment template**:
```bash
cp env.example .env
```

2. **Add your Neon connection string** to `.env`:
```bash
DATABASE_URL=postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

3. **Start the development server**:
```bash
npm run dev:neon
```

### Important Notes for Neon + Vercel Deployment

1. **Persistent Data**: Neon Database provides persistent PostgreSQL storage that works perfectly with Vercel's serverless functions.

2. **Serverless Optimized**: The `@neondatabase/serverless` driver is specifically designed for serverless environments.

3. **Free Tier**: Neon offers a generous free tier with 3GB storage and 10GB transfer per month.

4. **Automatic Scaling**: Neon automatically scales based on your usage.

5. **Branching**: Neon supports database branching for development and testing.

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
