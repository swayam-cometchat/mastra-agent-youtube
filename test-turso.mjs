#!/usr/bin/env node

// Test script to verify Turso database integration
import { createClient } from '@libsql/client';

async function testTursoConnection() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!tursoUrl || !tursoToken) {
    console.log('❌ Turso credentials not set. Please set:');
    console.log('   TURSO_DATABASE_URL=your-database-url');
    console.log('   TURSO_AUTH_TOKEN=your-auth-token');
    return;
  }
  
  try {
    console.log('🌟 Testing Turso connection...');
    
    const client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    
    // Test basic connection
    const result = await client.execute('SELECT 1 as test');
    console.log('✅ Connection successful:', result.rows[0]);
    
    // Test if our tables exist
    const tables = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('videos', 'transcript_segments')
    `);
    
    console.log('📊 Tables found:', tables.rows.map(row => row.name));
    
    // Test sample search
    if (tables.rows.length === 2) {
      const searchTest = await client.execute({
        sql: `SELECT COUNT(*) as count FROM transcript_segments`,
        args: []
      });
      console.log('📝 Transcript segments count:', searchTest.rows[0].count);
      
      // Test actual search
      const sampleSearch = await client.execute({
        sql: `SELECT ts.text, v.title FROM transcript_segments ts 
              JOIN videos v ON ts.video_id = v.id 
              WHERE ts.text LIKE ? LIMIT 2`,
        args: ['%algorithm%']
      });
      console.log('🔍 Sample search results:', sampleSearch.rows.length);
      if (sampleSearch.rows.length > 0) {
        console.log('   First result:', sampleSearch.rows[0].text.substring(0, 100) + '...');
      }
    } else {
      console.log('⚠️  Tables not found. You need to import your data first.');
      console.log('   Upload transcript_vectors_export.sql to your Turso database');
    }
    
  } catch (error) {
    console.error('❌ Turso test failed:', error.message);
  }
}

testTursoConnection();
