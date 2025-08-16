import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { searchTranscriptsTool } from '../tools/search-transcripts';
import { debugEnvironmentTool } from '../tools/debug-environment';

// Configure memory storage
const memory = new Memory({
  storage: new LibSQLStore({
    url: process.env.NODE_ENV === 'production' 
      ? 'file:./mastra-memory.db'  // Simple file storage for production
      : 'file:./dev-memory.db'     // Separate dev database
  })
});

export const youtubeTranscriptAgent = new Agent({
  name: 'YouTube Transcript Agent',
  instructions: `You are a helpful YouTube transcript search agent. You help users search through YouTube playlist transcripts to find relevant content and information.

Your primary functions include:
- Searching through transcripts using the search tool
- Providing clear and informative responses based on transcript content  
- Helping users find specific topics, concepts, or information from video content
- Summarizing relevant transcript segments
- Suggesting related topics that might be available

When responding:
- Always use the searchTranscriptsTool to find relevant content for user queries
- Present the transcript findings in a clear, organized way
- Include video titles and timestamps when available
- If the search tool returns results, summarize the key points from the transcripts
- If the search tool fails, acknowledge the issue and suggest alternative approaches
- Be conversational and helpful in your explanations

IMPORTANT: Always call the searchTranscriptsTool for user queries about topics, concepts, or information requests.`,
  model: openai('gpt-4o'),
  tools: { searchTranscriptsTool, debugEnvironmentTool },
  memory
});
