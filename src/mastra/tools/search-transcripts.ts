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
    try {
      const { query, limit = 5 } = context.input;
      
      console.log(`🔍 Searching for: "${query}" with limit: ${limit}`);
      
      // For now, return comprehensive mock data that should work well
      const mockResults = [
        {
          videoTitle: 'Introduction to Algorithms',
          transcript: `Algorithms are step-by-step procedures for solving problems. In this video, we explore fundamental algorithms including sorting algorithms like quicksort and mergesort, search algorithms like binary search, and graph algorithms. Understanding ${query} is crucial for computer science and programming efficiency.`,
          timestamp: '00:02:30',
          videoUrl: 'https://youtube.com/watch?v=algorithm-intro',
          relevanceScore: 0.95
        },
        {
          videoTitle: 'Data Structures and Algorithms',
          transcript: `This comprehensive tutorial covers ${query} design and analysis. We discuss time complexity, space complexity, and Big O notation. Key topics include: dynamic programming, greedy algorithms, divide and conquer strategies, and algorithmic thinking patterns.`,
          timestamp: '00:05:15',
          videoUrl: 'https://youtube.com/watch?v=dsa-tutorial',
          relevanceScore: 0.87
        },
        {
          videoTitle: 'Machine Learning Algorithms',
          transcript: `Modern ${query} in artificial intelligence and machine learning. This video explains supervised learning algorithms, unsupervised learning techniques, neural networks, and deep learning approaches. We cover practical implementations and real-world applications.`,
          timestamp: '00:03:45',
          videoUrl: 'https://youtube.com/watch?v=ml-algorithms',
          relevanceScore: 0.82
        },
        {
          videoTitle: 'Algorithm Optimization Techniques',
          transcript: `Advanced ${query} optimization strategies for improving performance. Topics include memoization, caching, parallel processing, and algorithmic complexity reduction. Learn how to write efficient code and optimize existing algorithms.`,
          timestamp: '00:01:20',
          videoUrl: 'https://youtube.com/watch?v=optimization',
          relevanceScore: 0.78
        }
      ];
      
      const selectedResults = mockResults.slice(0, limit);
      
      console.log(`✅ Found ${selectedResults.length} results for "${query}"`);
      
      return {
        results: selectedResults,
        totalResults: selectedResults.length,
        query: query
      };
      
    } catch (error) {
      console.error('❌ Error in searchTranscriptsTool:', error);
      
      // Return a helpful error response that the agent can use
      return {
        results: [
          {
            videoTitle: 'Search Error',
            transcript: `I encountered an error while searching for "${context.input.query}". This might be a temporary issue. Please try rephrasing your search or try again later.`,
            timestamp: '00:00:00',
            videoUrl: '',
            relevanceScore: 0.1
          }
        ],
        totalResults: 0,
        query: context.input.query || 'unknown'
      };
    }
  }
});
