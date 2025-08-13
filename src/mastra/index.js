// YouTube Transcript Agent - Mastra Integration
// This file serves as the entry point for Mastra deployment

const YouTubeTranscriptMastraAgent = require('../mastra-agent');

// Initialize the agent
console.log('🚀 Starting YouTube Transcript Agent for Mastra...');

const agent = new YouTubeTranscriptMastraAgent();

// Start the server
agent.start().then(() => {
  console.log('✅ YouTube Transcript Agent ready for Mastra!');
}).catch((error) => {
  console.error('❌ Failed to start agent:', error);
  process.exit(1);
});

// Export for potential programmatic use
module.exports = { agent };
