import { Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';

export const youtubeTranscriptAgent = new Agent({
  name: 'youtube-transcript-agent',
  instructions: `You are a YouTube transcript search agent. You help users search through YouTube playlist transcripts.`,
  model: openai('gpt-4o-mini')
});
