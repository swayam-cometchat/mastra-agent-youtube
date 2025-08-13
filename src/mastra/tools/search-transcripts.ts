import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const searchTranscriptsTool = createTool({
  id: 'searchTranscripts',
  description: 'Search through YouTube transcript content for relevant information',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant transcript content'),
    limit: z.number().optional().default(5).describe('Maximum number of results to return')
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      videoTitle: z.string(),
      transcript: z.string(),
      timestamp: z.string(),
      videoUrl: z.string(),
      relevanceScore: z.number()
    })),
    totalResults: z.number(),
    query: z.string()
  }),
  execute: async (context) => {
    const { query, limit = 5 } = context.input;
    
    try {
      // Only try to import database at runtime, not build time
      if (process.env.NODE_ENV === 'production' || process.env.MASTRA_DEPLOYMENT) {
        // In production/cloud, use mock data or external API
        return {
          results: [
            {
              videoTitle: 'Sample Video',
              transcript: `Production search result for: "${query}"`,
              timestamp: '0:00',
              videoUrl: 'https://youtube.com/watch?v=sample',
              relevanceScore: 0.8
            }
          ],
          totalResults: 1,
          query
        };
      }
      
      // For local development, try to use the vector database
      const VectorDatabase = require('../../services/vectorDatabase.js');
      const vectorDb = new VectorDatabase();
      
      const results = await vectorDb.semanticSearch(query, limit);
      
      return {
        results: results.map((result: any) => ({
          videoTitle: result.videoTitle || 'Unknown Video',
          transcript: result.text || result.content || '',
          timestamp: result.timestamp || '0:00',
          videoUrl: result.videoUrl || '',
          relevanceScore: result.similarity || 0
        })),
        totalResults: results.length,
        query
      };
    } catch (error) {
      console.error('Search tool error:', error);
      // Fallback for any errors
      return {
        results: [
          {
            videoTitle: 'Fallback Result',
            transcript: `Error occurred while searching for: "${query}". Please try again.`,
            timestamp: '0:00',
            videoUrl: '',
            relevanceScore: 0.1
          }
        ],
        totalResults: 1,
        query
      };
    }
  }
});
