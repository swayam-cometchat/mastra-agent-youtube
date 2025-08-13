import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const searchTranscriptsTool = createTool({
  id: 'searchTranscripts',
  description: 'Search through YouTube playlist transcripts for relevant content',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant transcript content'),
    limit: z.number().optional().default(3).describe('Maximum number of results to return')
  }),
  outputSchema: z.array(z.object({
    text: z.string(),
    videoTitle: z.string(),
    videoId: z.string(),
    timestamp: z.string(),
    relevanceScore: z.number()
  })),
  execute: async ({ query, limit = 3 }) => {
    // Simple mock implementation for now - will connect to real DB later
    return [
      {
        text: `Found content related to "${query}"`,
        videoTitle: 'Sample Video',
        videoId: 'abc123',
        timestamp: '00:01:30',
        relevanceScore: 0.85
      }
    ];
  }
});
