// YouTube Transcript Search Agent  
import { openai } from '@ai-sdk/openai';
import * as MastraCore from '@mastra/core';

// Create a simple test agent first
export const youtubeTranscriptAgent = new MastraCore.Agent({
  name: 'youtube-transcript-agent',
  instructions: `You are a YouTube transcript search agent. You help users search through YouTube playlist transcripts.`,
  model: openai('gpt-4o-mini')
});
