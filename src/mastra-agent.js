require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const EnhancedMetadataAgent = require('./agents/enhancedMetadataAgent');
const CloudVectorDatabase = require('./services/cloudVectorDatabase');

class YouTubeTranscriptMastraAgent {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.agent = null;
    
    this.setupExpress();
    this.initializeAgent();
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        agent: 'youtube-transcript-agent',
        version: '1.0.0'
      });
    });

    // Process playlist endpoint
    this.app.post('/process-playlist', async (req, res) => {
      try {
        const { playlistUrl, options = {} } = req.body;
        
        if (!playlistUrl) {
          return res.status(400).json({ 
            error: 'playlistUrl is required' 
          });
        }

        console.log(`📋 Processing playlist: ${playlistUrl}`);
        
        const result = await this.agent.processPlaylist(playlistUrl, {
          maxVideos: options.maxVideos || 15,
          forceRefresh: options.forceRefresh || false
        });

        res.json({
          success: true,
          message: 'Playlist processed successfully',
          data: result
        });

      } catch (error) {
        console.error('❌ Playlist processing error:', error);
        res.status(500).json({ 
          error: error.message,
          success: false 
        });
      }
    });

    // Search endpoint
    this.app.post('/search', async (req, res) => {
      try {
        const { query, playlistUrl, options = {} } = req.body;
        
        if (!query) {
          return res.status(400).json({ 
            error: 'query is required' 
          });
        }

        console.log(`🔍 Searching for: "${query}"`);
        
        let result;
        if (playlistUrl) {
          // Search specific playlist
          result = await this.agent.queryPlaylist(playlistUrl, query, {
            limit: options.limit || 5,
            minSimilarity: options.minSimilarity || 0.3
          });
        } else {
          // Global search across all transcripts
          result = await this.agent.vectorDb.searchTranscripts(query, options.limit || 5);
        }

        res.json({
          success: true,
          query,
          results: result.results || [],
          totalResults: result.results?.length || 0,
          searchType: result.searchType || 'AI-powered semantic search'
        });

      } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ 
          error: error.message,
          success: false 
        });
      }
    });

    // Get database stats
    this.app.get('/stats', async (req, res) => {
      try {
        const stats = await this.agent.vectorDb.getStats();
        res.json({
          success: true,
          stats,
          databaseUrl: process.env.DATABASE_URL || 'local'
        });
      } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ 
          error: error.message,
          success: false 
        });
      }
    });
  }

  async initializeAgent() {
    try {
      console.log('🚀 Initializing YouTube Transcript Agent for Mastra');
      
      // Initialize the enhanced metadata agent
      this.agent = new EnhancedMetadataAgent();
      
      console.log('✅ Agent initialized successfully');
      
    } catch (error) {
      console.error('❌ Agent initialization error:', error);
      throw error;
    }
  }

  async start() {
    try {
      this.app.listen(this.port, '0.0.0.0', () => {
        console.log('🎉 YouTube Transcript Agent API Server Running!');
        console.log('==============================================');
        console.log(`🌐 Server: http://localhost:${this.port}`);
        console.log(`📡 Health: http://localhost:${this.port}/health`);
        console.log(`🔍 Search: POST http://localhost:${this.port}/search`);
        console.log(`📋 Process: POST http://localhost:${this.port}/process-playlist`);
        console.log(`📊 Stats: GET http://localhost:${this.port}/stats`);
        console.log('');
        console.log('🚀 Ready for Mastra deployment!');
        console.log('� Use ngrok for public access: ngrok http 3000');
      });
    } catch (error) {
      console.error('❌ Server start error:', error);
      throw error;
    }
  }

  async close() {
    if (this.agent) {
      await this.agent.close();
    }
  }
}

// Start the agent
const mastraAgent = new YouTubeTranscriptMastraAgent();
mastraAgent.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Graceful shutdown...');
  await mastraAgent.close();
  process.exit(0);
});

module.exports = YouTubeTranscriptMastraAgent;
