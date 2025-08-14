#!/usr/bin/env node

// Test the Mastra search tool with Turso
import { searchTranscriptsTool } from './src/mastra/tools/search-transcripts.ts';

async function testMastraWithTurso() {
  console.log('🧪 Testing Mastra search tool with Turso...');
  
  try {
    const result = await searchTranscriptsTool.execute({
      context: {
        query: 'algorithm',
        limit: 3
      }
    });
    
    console.log('🎯 Search Results:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testMastraWithTurso();
