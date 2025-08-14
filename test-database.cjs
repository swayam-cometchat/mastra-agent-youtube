const VectorDatabase = require('./src/services/vectorDatabase.js');

async function testDatabase() {
  console.log('🧪 Testing Real Vector Database');
  console.log('==============================\n');

  try {
    // Create database instance
    const db = new VectorDatabase();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Database connected');
    
    // Test queries
    const testQueries = ['algorithm', 'python', 'javascript', 'function'];
    
    for (const query of testQueries) {
      console.log(`🔍 Testing: "${query}"`);
      
      try {
        const results = await db.searchTranscripts(query, 2);
        console.log(`   Found ${results.length} results`);
        
        if (results.length > 0) {
          results.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.video?.title || 'No title'}`);
            console.log(`      Relevance: ${result.relevanceScore || 'N/A'}`);
            if (result.matchingSegments && result.matchingSegments.length > 0) {
              const segment = result.matchingSegments[0];
              console.log(`      Text: ${segment.text?.substring(0, 80)}...`);
            }
          });
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      console.log('');
    }
    
    // Close database
    if (db.close) {
      await db.close();
    }
    
    console.log('✅ Database test completed');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\n💡 This is expected if database is empty or file doesn\'t exist');
  }
}

testDatabase();
