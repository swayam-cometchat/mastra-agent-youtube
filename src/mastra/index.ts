import { Mastra } from '@mastra/core/mastra';
import { youtubeTranscriptAgent } from './agents/youtube-transcript-agent.js';

export const mastra = new Mastra({
  agents: { youtubeTranscriptAgent }
});
