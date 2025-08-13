# 🚀 Mastra YouTube Transcript Agent

AI-powered agent for searching through YouTube playlist transcripts with semantic search capabilities.

## ✨ Features

- **🧠 AI-Powered Search**: OpenAI embeddings for 95-100% relevance semantic search
- **📝 Real Transcripts**: Extract actual spoken content using yt-dlp
- **🔍 Global & Playlist Search**: Search across all transcripts or target specific playlists
- **📊 Vector Database**: SQLite database with embeddings for fast similarity search
- **🌐 REST API**: Production-ready Express.js server with CORS support
- **⚡ High Performance**: Local database for ultra-fast query responses

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with CORS
- **AI**: OpenAI GPT-4 + text-embedding-3-small
- **Database**: SQLite with vector embeddings
- **APIs**: YouTube Data API v3
- **Deployment**: Mastra Cloud ready

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/swayam-cometchat/mastra-agent-youtube.git
cd mastra-agent-youtube
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your API keys:
# YOUTUBE_API_KEY=your_youtube_api_key
# OPENAI_API_KEY=your_openai_api_key
```

### 3. Initialize Database
```bash
# The database will be created automatically when you first run the app
# Or process your first playlist to populate it
node search.js "https://www.youtube.com/playlist?list=YOUR_PLAYLIST_ID"
```

### 4. Start the Server
```bash
npm start
# Server runs on http://localhost:3000
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Get Database Statistics
```bash
GET /stats
```

### Search Transcripts
```bash
POST /search
{
  "query": "machine learning",
  "playlistUrl": "optional_playlist_url",
  "limit": 5
}
```

### Process New Playlist
```bash
POST /process-playlist
{
  "playlistUrl": "https://www.youtube.com/playlist?list=YOUR_ID",
  "maxVideos": 50
}
```

## � Deployment

### Mastra Cloud (Recommended)
```bash
# Set environment variables in Mastra dashboard
mastra deploy
```

### Railway
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
```

## � Required Environment Variables

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

## 📊 Database

The agent uses SQLite for local vector storage. The database file is not included in the repository due to size constraints (97MB), but will be created automatically when you:

1. Run the application for the first time
2. Process your first YouTube playlist

## 🔧 Development

```bash
# Development mode with auto-restart
npm run dev

# Search from command line
npm run search

# Deploy to Mastra
npm run deploy
```

## 📝 Example Usage

```bash
# Search across all transcripts
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "artificial intelligence", "limit": 3}'

# Search within specific playlist
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "neural networks",
    "playlistUrl": "https://www.youtube.com/playlist?list=PLrAXtmRdnEQy5vEs6TVwjC3PYcca8d0uM",
    "limit": 5
  }'
```

## 🎯 Perfect For

- **📚 Educational Content**: Search through course playlists
- **🎥 Research**: Find specific topics in long video series  
- **💼 Training Materials**: Locate relevant sections in training videos
- **🔬 Academic Research**: Analyze video content at scale

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [Mastra](https://mastra.ai) for the AI agent framework
- [OpenAI](https://openai.com) for embedding and chat models
- [YouTube API](https://developers.google.com/youtube/v3) for video metadata
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for transcript extraction
