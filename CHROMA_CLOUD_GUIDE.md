# 🚀 Chroma Cloud Deployment Guide

## Step 1: Sign up for Chroma Cloud
1. Go to [Chroma Cloud](https://airtable.com/shrOAiDUtS2ILy5vZ) (waitlist signup)
2. Once approved, you'll get access to the Chroma Cloud dashboard
3. Create a new database/cluster

## Step 2: Get Your Credentials
From your Chroma Cloud dashboard:
- **Database URL**: Something like `https://your-db-id.api.trychroma.com`
- **API Key**: Your authentication token

## Step 3: Export Your Local Data
Run this script to export your current ChromaDB collection:

```bash
# Create export script
node export-chroma-data.js
```

This will create a `chroma-export.json` file with all your data.

## Step 4: Upload to Chroma Cloud
Use the Chroma Cloud dashboard or API to:
1. Create collection named `youtube_transcripts_complete`
2. Upload your exported data
3. Verify the import completed successfully

## Step 5: Update Environment Variables
Update your production environment with:
```env
NODE_ENV=production
CHROMA_CLOUD_URL=https://your-db-id.api.trychroma.com
CHROMA_CLOUD_API_KEY=your-api-key-here
CHROMA_COLLECTION_NAME=youtube_transcripts_complete
```

## Step 6: Deploy to Mastra
1. Update your Mastra deployment with new environment variables
2. Deploy the updated code
3. Test the vector search functionality

## Verification
Your agent will automatically use Chroma Cloud in production while keeping local ChromaDB for development.

## Alternative: Self-Hosted Chroma
If Chroma Cloud isn't available, you can:
1. Deploy ChromaDB to Railway, Render, or Docker container
2. Update CHROMA_CLOUD_URL to your hosted instance
3. Skip the API key if using open instance
