# Mastra YouTube Transcript Agent

## Overview
This project is a YouTube transcript search agent built with the Mastra framework. It ingests YouTube playlist transcripts into Chroma Cloud, enabling fast semantic and keyword search over video content. The agent uses OpenAI embeddings for semantic search and supports exact keyword matching. It is designed for both local development and production deployment.

## Features
- Ingest transcripts from any YouTube playlist
- Store transcript segments in Chroma Cloud with metadata (timestamps, video info)
- Semantic search using OpenAI embeddings
- Exact keyword search (case-insensitive)
- Mastra agent API for querying transcripts
- Tools for cleaning, verifying, and managing Chroma Cloud data

## Prerequisites
- Node.js (v18+ recommended)
- npm
- Chroma Cloud account and API keys
- OpenAI API key
- YouTube Data API key
- (Optional) YouTube OAuth2 credentials for captions

## Setup
1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd mastra-agent-youtube
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` (or create `.env` manually)
   - Fill in your API keys:
     - `CHROMA_CLOUD_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`, `CHROMA_COLLECTION_NAME`
     - `OPENAI_API_KEY`
     - `YOUTUBE_API_KEY`
     - (Optional) YouTube OAuth2 credentials

## Ingesting Your Playlist
To ingest transcripts from your own YouTube playlist:

1. **Edit the playlist URL in the ingestion script:**
   - Open `scripts/ingest-playlist-to-chroma.js`
   - Change the value of `playlistUrl` to your playlist:
     ```js
     const playlistUrl = 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID&list=YOUR_PLAYLIST_ID';
     ```
2. **Clear the Chroma Cloud collection (recommended for fresh ingest):**
   ```sh
   node scripts/clear-chroma-collection.js
   ```
3. **Run the ingestion script:**
   ```sh
   node scripts/ingest-playlist-to-chroma.js
   ```
   - This will fetch transcripts for all videos in the playlist and upload them to Chroma Cloud.
   - Segments are stored with metadata (start/end time, video info).

## Running the Agent (Local Development)
1. **Start the Mastra agent server:**
   ```sh
   npm run dev
   ```
   - The API will be available at `http://localhost:4112/api`
   - Playground UI at `http://localhost:4112`
2. **Search transcripts via API or playground:**
   - Use the `searchTranscriptsTool` to query for keywords or topics.
   - Results include transcript snippet, video title, timestamp, and video URL.

## Production Deployment
1. **Set up `.env.production` with all required keys.**
2. **Install dependencies in production:**
   ```sh
   npm install
   npm install @chroma-core/openai
   ```
3. **Clear and ingest data as above.**
4. **Build and start the agent:**
   ```sh
   npm run build
   npm start
   ```

## Data Management & Utilities
- **Check segment count:**
  ```sh
  node scripts/check-chroma-count.js
  ```
- **Check for keyword presence:**
  ```sh
  node scripts/check-chroma-keyword.js
  ```
- **Clean up old/invalid segments:**
  ```sh
  node scripts/cleanup-chroma-old-segments.js
  ```

## Troubleshooting
- **Fallback results:**
  - Ensure all Chroma/OpenAI keys are set and correct in `.env`.
  - Make sure ingestion and agent scripts use `OpenAIEmbeddingFunction` from `@chroma-core/openai`.
  - Clear and re-ingest if you change embedding model/dimension.
- **Quota errors:**
  - Chroma Cloud has batch size limits (usually 100). Adjust scripts if needed.
- **No transcript found:**
  - Some videos may not have auto-generated captions. Check logs for warnings.

## Customization
- **Change playlist:** Edit `playlistUrl` in `scripts/ingest-playlist-to-chroma.js`.
- **Change embedding model/dimension:** Update the embedder config in all scripts and re-ingest data.
- **Add more tools or agents:** Extend the Mastra agent and tools in `src/mastra/agents` and `src/mastra/tools`.

## Project Structure
- `scripts/` — Utility scripts for ingesting, cleaning, and verifying Chroma data
- `src/mastra/agents/` — Mastra agent definitions
- `src/mastra/tools/` — Search and utility tools
- `src/services/` — Service modules for Chroma, YouTube, transcript extraction
- `.env` — Environment variables

## License
MIT

## Credits
- [Mastra Framework](https://github.com/cometchat-open/mastra)
- [ChromaDB](https://www.trychroma.com/)
- [OpenAI](https://openai.com/)
- [YouTube Data API](https://developers.google.com/youtube/v3)

---

**For any issues or questions, open an issue or contact the maintainer.**
