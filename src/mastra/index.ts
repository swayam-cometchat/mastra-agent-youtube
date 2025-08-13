import { Mastra } from '@mastra/core/mastra';
import { youtubeTranscriptAgent } from './agents/youtube-transcript-agent';

export const mastra = new Mastra({
  agents: { youtubeTranscriptAgent }
});
