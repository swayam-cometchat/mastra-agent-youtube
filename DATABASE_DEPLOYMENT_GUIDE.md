# Database Deployment Solutions

## The Problem
The 97MB transcript_vectors.db file is too large for Mastra's deployment platform, causing the agent to use fallback data instead of real transcript content.

## Solution Options

### Option 1: External File Hosting (Recommended)
Upload your database file to a cloud storage service and download it at runtime.

**Steps:**
1. Upload `data/transcript_vectors.db` to one of these services:
   - Google Drive (get direct download link)
   - GitHub Releases
   - AWS S3 (with public access)
   - Dropbox (with direct link)
   - Any CDN service

2. Set environment variable in Mastra:
   ```
   DATABASE_FILE_URL=https://your-service.com/path/to/transcript_vectors.db
   ```

3. The agent will automatically download and cache the database on first use.

### Option 2: Database-as-a-Service
Host the database on a cloud database service.

**Steps:**
1. Upload to services like:
   - Railway (SQLite hosting)
   - PlanetScale
   - Supabase
   - Turso (SQLite edge database)

2. Set environment variables:
   ```
   DATABASE_URL=https://your-database-api.com
   DATABASE_API_KEY=your-api-key
   ```

### Option 3: Compressed Database
Create a smaller, compressed version of the database.

**Steps:**
1. Export essential data only
2. Use database compression
3. Include in deployment

## Quick Setup for Option 1 (GitHub Releases)

1. Create a new release in your GitHub repo
2. Upload `transcript_vectors.db` as a release asset
3. Get the direct download URL
4. Set in Mastra deployment:
   ```
   DATABASE_FILE_URL=https://github.com/your-username/your-repo/releases/download/v1.0/transcript_vectors.db
   ```

## Environment Variables for Mastra

Add these to your Mastra deployment configuration:

```json
{
  "environment": {
    "NODE_ENV": "production",
    "MASTRA_DEPLOYMENT": "true",
    "DATABASE_FILE_URL": "your-database-url-here"
  }
}
```

The agent will automatically detect these variables and use the appropriate database source.
