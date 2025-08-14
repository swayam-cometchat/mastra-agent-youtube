# Database Migration to Turso Cloud

## Current Status
- ✅ SQLite database: 97MB with 3,375 transcript segments
- ✅ Database exported to SQL dump: 95MB (`transcript_vectors_export.sql`)
- ✅ Agent deployed to Mastra Cloud (currently using fallback data)
- ✅ Turso client integration added to search tool

## Why Turso?
- 🆓 Free tier: 500MB storage (your 97MB fits perfectly)
- 🔄 SQLite-compatible (minimal code changes)
- 🌍 Edge distributed access (fast worldwide)
- 🛠️ Same SQL queries work as-is

## Migration Steps

### 1. Create Turso Account & Database
1. Go to [turso.tech](https://turso.tech) and sign up (free)
2. Create a new database called `youtube-transcripts`
3. Get your database URL and auth token from the dashboard

### 2. Upload Your Data
```bash
# Option A: Use Turso CLI (if you have it installed)
turso db create youtube-transcripts
turso db shell youtube-transcripts < transcript_vectors_export.sql

# Option B: Use the web interface
# Upload the transcript_vectors_export.sql file via Turso dashboard
```

### 3. Test the Connection
```bash
# Set your credentials
export TURSO_DATABASE_URL="libsql://youtube-transcripts-[your-org].turso.io"
export TURSO_AUTH_TOKEN="your-auth-token-here"

# Test the connection
node test-turso.js
```

### 4. Deploy to Mastra Cloud
```bash
# Set environment variables in your Mastra deployment:
TURSO_DATABASE_URL=libsql://youtube-transcripts-[your-org].turso.io
TURSO_AUTH_TOKEN=your-auth-token-here

# Deploy
npx mastra deploy
```

### 5. Test Your Agent
Search for "interoperability" - should now return real content from your Computer Science playlist!

## Code Changes Made
- ✅ Added `@libsql/client` dependency
- ✅ Created `searchTursoDatabase()` function
- ✅ Updated execution order: Turso → Remote Download → Local → Fallback
- ✅ Added test script (`test-turso.js`)

## Environment Variables Priority
1. `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` → Turso cloud database
2. `DATABASE_FILE_URL` → Remote database download
3. Local SQLite file → Development fallback
4. Mock data → Final fallback

## Benefits After Migration
- ✅ Real transcript search in production
- ✅ No more 97MB file hosting issues  
- ✅ Fast edge access worldwide
- ✅ Reliable cloud infrastructure
- ✅ Free tier sufficient for your needs
