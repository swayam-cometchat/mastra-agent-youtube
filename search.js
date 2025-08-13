require('dotenv').config();
const EnhancedMetadataAgent = require('./src/agents/enhancedMetadataAgent');

async function searchKeyword() {
  // Get keyword from command line argument
  const keyword = process.argv[2];
  
  if (!keyword) {
    console.log('❌ Please provide a search keyword');
    console.log('Usage: node search.js "your keyword"');
    console.log('Example: node search.js "straightforward"');
    return;
  }
  
  const agent = new EnhancedMetadataAgent();
  
  try {
    console.log(`🔍 Searching for: "${keyword}"`);
    console.log('================================\n');
    
    const playlistUrl = 'https://www.youtube.com/playlist?list=PLH2l6uzC4UEW0s7-KewFLBC1D0l6XRfye';
    
    const result = await agent.queryPlaylist(playlistUrl, keyword, {
      limit: 5,
      minSimilarity: 0.3 // Increased from 0.2 to filter out poor matches
    });
    
    if (result.success && result.results.length > 0) {
      console.log(`✅ Found ${result.results.length} results:\n`);
      
      result.results.forEach((item, index) => {
        // Clean up the text display
        let displayText = item.content.text.replace(/^Real Transcript:\s*/, '');
        
        // Remove repetitive text patterns
        const words = displayText.split(' ');
        if (words.length > 20) {
          // Look for repetition and cut it short
          const firstHalf = words.slice(0, 10).join(' ');
          const secondHalf = words.slice(10, 20).join(' ');
          if (firstHalf === secondHalf) {
            displayText = firstHalf + '...';
          } else {
            displayText = words.slice(0, 15).join(' ') + '...';
          }
        } else if (displayText.length > 100) {
          displayText = displayText.substring(0, 100) + '...';
        }
        
        console.log(`${index + 1}. ${item.video.title}`);
        console.log(`   📊 Relevance: ${(item.relevanceScore * 100).toFixed(1)}%`);
        console.log(`   💬 "${displayText}"`);
        console.log(`   🔗 ${item.video.watchUrl}`);
        console.log('');
      });
      
    } else {
      console.log('❌ No results found');
      console.log('💡 Try different keywords or run: npm start');
    }
    
  } catch (error) {
    console.error('❌ Search error:', error.message);
    
    if (error.message.includes('playlist not found')) {
      console.log('\n💡 First run: npm start');
    }
  } finally {
    await agent.close();
  }
}

searchKeyword();
