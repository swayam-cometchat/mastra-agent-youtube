require('dotenv').config();
const EnhancedMetadataAgent = require('./agents/enhancedMetadataAgent');

async function main() {
  const agent = new EnhancedMetadataAgent();
  
  try {
    console.log('🚀 Mastra YouTube Transcript Agent');
    console.log('==================================\n');
    
    // Replace with your target playlist
    const playlistUrl = 'https://www.youtube.com/playlist?list=PLH2l6uzC4UEW0s7-KewFLBC1D0l6XRfye';
    
    console.log('📋 Processing playlist with real transcripts...');
    console.log('⏱️  This may take a few minutes for initial processing\n');
    
    const result = await agent.processPlaylist(playlistUrl, {
      maxVideos: 15,
      forceRefresh: false // Only process new videos, not existing ones
    });
    
    if (result.success) {
      console.log('\n✅ Processing complete!');
      console.log('========================');
      console.log(`📹 Videos processed: ${result.processing?.processedVideos || 'N/A'}`);
      console.log(`💬 Transcript segments: ${result.processing?.totalSegments || 'N/A'}`);
      console.log(`🎬 Playlist: ${result.playlist?.title || 'Unknown'}`);
      console.log(`📺 Channel: ${result.playlist?.channelTitle || 'Unknown'}`);
      
      console.log('\n🎉 Ready for search!');
      console.log('===================');
      console.log('Usage: node search.js "your search query"');
      console.log('\nExample searches:');
      console.log('  node search.js "polynomials"');
      console.log('  node search.js "relationship between variables"');
      console.log('  node search.js "computer algorithms"');
      console.log('  node search.js "binary numbers"');
      
    } else {
      console.log('❌ Processing failed');
      console.log('💡 Check your API keys and internet connection');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Please check your .env file contains:');
      console.log('   YOUTUBE_API_KEY=your_youtube_api_key');
      console.log('   OPENAI_API_KEY=your_openai_api_key');
    } else if (error.message.includes('quota')) {
      console.log('\n💡 YouTube API quota exceeded. Please try again later.');
    }
  } finally {
    await agent.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = EnhancedMetadataAgent;
