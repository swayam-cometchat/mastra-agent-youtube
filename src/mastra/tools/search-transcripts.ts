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
    
    // Return mock data for now to fix build issues
    // TODO: Integrate with real vector database
    const mockResults = [
      {
        videoTitle: "Advanced JavaScript Concepts",
        transcript: `This video covers advanced ${query} concepts in JavaScript programming. We explore how ${query} can be implemented effectively in modern applications.`,
        timestamp: "05:23",
        videoUrl: "https://youtube.com/watch?v=example1",
        relevanceScore: 0.95
      },
      {
        videoTitle: "Complete Tutorial Series",
        transcript: `In this comprehensive tutorial, we dive deep into ${query} and its practical applications. Learn best practices and common patterns.`,
        timestamp: "12:45",
        videoUrl: "https://youtube.com/watch?v=example2",
        relevanceScore: 0.88
      },
      {
        videoTitle: "Real-world Examples",
        transcript: `Here we demonstrate real-world examples of ${query} in action. See how professionals use these techniques in production environments.`,
        timestamp: "08:12",
        videoUrl: "https://youtube.com/watch?v=example3",
        relevanceScore: 0.82
      }
    ];

    return {
      query,
      results: mockResults.slice(0, limit),
      totalResults: mockResults.length
    };
  }
});
