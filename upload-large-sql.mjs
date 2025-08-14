#!/usr/bin/env node

// Chunked upload script for large SQL files to Turso
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

async function uploadLargeSQL() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!tursoUrl || !tursoToken) {
    console.log('❌ Turso credentials not set');
    return;
  }
  
  try {
    console.log('🌟 Connecting to Turso...');
    
    const client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    
    // Test connection first
    await client.execute('SELECT 1');
    console.log('✅ Connection successful');
    
    console.log('📂 Reading SQL file...');
    const sqlContent = readFileSync('transcript_vectors_export.sql', 'utf8');
    
    console.log('🔀 Processing SQL statements...');
    
    // Split by semicolon, clean up, and filter
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('/*') &&
        stmt !== 'PRAGMA foreign_keys=OFF' &&
        stmt !== 'BEGIN TRANSACTION' &&
        stmt !== 'COMMIT'
      );
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Group statements by type for better processing
    const createStatements = statements.filter(stmt => stmt.startsWith('CREATE'));
    const insertStatements = statements.filter(stmt => stmt.startsWith('INSERT'));
    
    console.log(`📋 ${createStatements.length} CREATE statements`);
    console.log(`📥 ${insertStatements.length} INSERT statements`);
    
    // Execute CREATE statements first
    console.log('🏗️  Creating tables...');
    for (const stmt of createStatements) {
      try {
        await client.execute(stmt + ';');
        console.log('   ✅ Created table/index');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('   ⚠️  Table already exists, skipping');
        } else {
          console.log(`   ❌ Error: ${error.message.substring(0, 100)}...`);
        }
      }
    }
    
    // Execute INSERT statements in batches
    console.log('📥 Inserting data in batches...');
    const batchSize = 50; // Smaller batches for better reliability
    let inserted = 0;
    
    for (let i = 0; i < insertStatements.length; i += batchSize) {
      const batch = insertStatements.slice(i, i + batchSize);
      
      // Execute batch without explicit transactions (let Turso handle it)
      try {
        for (const stmt of batch) {
          try {
            await client.execute(stmt + ';');
            inserted++;
          } catch (stmtError) {
            if (!stmtError.message.includes('UNIQUE constraint')) {
              console.log(`     ⚠️  Statement skipped: ${stmtError.message.substring(0, 50)}...`);
            }
          }
        }
        
        console.log(`   ✅ Batch ${Math.ceil((i + batchSize) / batchSize)}/${Math.ceil(insertStatements.length / batchSize)} completed (${inserted}/${insertStatements.length} records)`);
        
      } catch (error) {
        console.log(`   ⚠️  Batch error: ${error.message.substring(0, 100)}...`);
      }
      
      // Small delay to avoid overwhelming the server
      if (i % 500 === 0) {
        console.log(`   🔄 Progress: ${Math.round((i / insertStatements.length) * 100)}%`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`🎉 Upload complete! Inserted ${inserted} records`);
    
    // Verify the data
    console.log('🔍 Verifying data...');
    
    try {
      const tables = await client.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      console.log(`📊 Tables created: ${tables.rows.map(r => r.name).join(', ')}`);
      
      if (tables.rows.some(r => r.name === 'transcript_segments')) {
        const count = await client.execute('SELECT COUNT(*) as count FROM transcript_segments');
        console.log(`📝 Transcript segments: ${count.rows[0].count}`);
      }
      
      if (tables.rows.some(r => r.name === 'videos')) {
        const videoCount = await client.execute('SELECT COUNT(*) as count FROM videos');
        console.log(`🎬 Videos: ${videoCount.rows[0].count}`);
      }
      
      // Test a sample query
      if (tables.rows.some(r => r.name === 'transcript_segments')) {
        const sampleSearch = await client.execute({
          sql: `SELECT ts.text, v.title FROM transcript_segments ts 
                JOIN videos v ON ts.video_id = v.id 
                WHERE ts.text LIKE ? LIMIT 2`,
          args: ['%algorithm%']
        });
        console.log(`🔍 Sample search found ${sampleSearch.rows.length} results`);
        if (sampleSearch.rows.length > 0) {
          console.log(`   First result: "${sampleSearch.rows[0].text.substring(0, 60)}..."`);
        }
      }
      
    } catch (error) {
      console.log(`⚠️  Verification error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    console.error('Full error:', error);
  }
}

uploadLargeSQL();
