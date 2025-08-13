// YouTube Transcript Agent - Mastra Integration
const { Mastra, createTool } = require('@mastra/core');
const { Agent } = require('@mastra/core/agent');
const EnhancedMetadataAgent = require('../agents/enhancedMetadataAgent');

// Initialize the enhanced metadata agent for backend operations
let enhancedAgent = null;

async function initializeAgent() {
  if (!enhancedAgent) {
    enhancedAgent = new EnhancedMetadataAgent();
    console.log('✅ Enhanced metadata agent initialized');
  }
  return enhancedAgent;
}

// Create tools
const searchTranscriptsTool = createTool({
  name: 'search_transcripts',
  description: 'Search through YouTube playlist transcripts using semantic similarity',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for transcript content'
      },
      playlistUrl: {
        type: 'string',
        description: 'Optional: specific playlist URL to search within'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)'
      }
    },
    required: ['query']
  },
  handler: async ({ query, playlistUrl, limit = 5 }) => {
    try {
      const agent = await initializeAgent();
      
      const results = playlistUrl 
        ? await agent.searchTranscripts(query, playlistUrl, { limit })
        : await agent.globalSearch(query, { limit });
      
      return {
        success: true,
        results: results.map(result => ({
          text: result.text,
          videoTitle: result.videoTitle,
          videoUrl: result.videoUrl,
          playlistTitle: result.playlistTitle,
          timestamp: result.timestamp,
          relevanceScore: result.relevanceScore,
          metadata: result.metadata
        })),
        query,
        totalResults: results.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const processPlaylistTool = createTool({
  name: 'process_playlist',
  description: 'Process a YouTube playlist to extract and index transcripts',
  parameters: {
    type: 'object',
    properties: {
      playlistUrl: {
        type: 'string',
        description: 'YouTube playlist URL to process'
      },
      maxVideos: {
        type: 'number',
        description: 'Maximum number of videos to process (default: 15)'
      },
      forceRefresh: {
        type: 'boolean',
        description: 'Force refresh of existing data (default: false)'
      }
    },
    required: ['playlistUrl']
  },
  handler: async ({ playlistUrl, maxVideos = 15, forceRefresh = false }) => {
    try {
      const agent = await initializeAgent();
      
      const result = await agent.processPlaylist(playlistUrl, {
        maxVideos,
        forceRefresh
      });
      
      return {
        success: true,
        message: `Successfully processed ${result.processedVideos} videos from playlist`,
        processedVideos: result.processedVideos,
        totalSegments: result.totalSegments,
        playlistTitle: result.playlistTitle
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const getStatsTool = createTool({
  name: 'get_stats',
  description: 'Get database statistics including total playlists, videos, and transcript segments',
  parameters: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    try {
      const agent = await initializeAgent();
      const stats = await agent.vectorDb.getStats();
      
      return {
        success: true,
        stats: {
          totalPlaylists: stats.totalPlaylists,
          totalVideos: stats.totalVideos,
          totalSegments: stats.totalSegments,
          databaseSize: stats.databaseSize,
          databaseUrl: process.env.DATABASE_URL || 'local'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

// Define the agent with tools
const youtubeTranscriptAgent = new Agent({
  name: 'YouTube Transcript Search Agent',
  instructions: `You are a YouTube transcript search agent. You can:
    1. Process YouTube playlists to extract and index transcripts
    2. Search through indexed transcripts using semantic similarity
    3. Provide relevant transcript segments with metadata
    4. Return search results with confidence scores`,
  model: {
    provider: 'OPENAI',
    name: 'gpt-4o-mini'
  },
  tools: [searchTranscriptsTool, processPlaylistTool, getStatsTool]
});

// Create the Mastra instance and add the agent
const mastra = new Mastra({
  name: 'youtube-transcript-agent',
  version: '1.0.0',
  agents: [youtubeTranscriptAgent]
});

module.exports = mastra;
