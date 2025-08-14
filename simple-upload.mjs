#!/usr/bin/env node

// Simple upload script that handles dependencies properly
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

async function simpleUpload() {
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
    
    // Disable foreign keys to avoid constraint issues during import
    await client.execute('PRAGMA foreign_keys = OFF;');
    console.log('🔓 Disabled foreign key constraints');
    
    console.log('📂 Reading SQL file...');
    const sqlContent = readFileSync('transcript_vectors_export.sql', 'utf8');
    
    // Split into statements but keep the original order from the dump
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.includes('PRAGMA foreign_keys') &&
        !stmt.includes('BEGIN TRANSACTION') &&
        !stmt.includes('COMMIT')
      );
    
    console.log(`📊 Found ${statements.length} statements to execute`);
    
    let executed = 0;
    let skipped = 0;
    
    console.log('⚡ Executing statements...');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      try {
        await client.execute(stmt + ';');
        executed++;
        
        if (executed % 200 === 0) {
          console.log(`   ✅ Progress: ${executed}/${statements.length} (${Math.round((executed/statements.length)*100)}%)`);
        }
        
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('UNIQUE constraint')) {
          skipped++;
        } else {
          console.log(`   ⚠️  Error in statement ${i}: ${error.message.substring(0, 80)}...`);
          skipped++;
        }
      }
      
      // Throttle to avoid overwhelming the server
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Re-enable foreign keys
    await client.execute('PRAGMA foreign_keys = ON;');
    console.log('🔒 Re-enabled foreign key constraints');
    
    console.log(`🎉 Upload complete!`);
    console.log(`   ✅ Executed: ${executed} statements`);
    console.log(`   ⚠️  Skipped: ${skipped} statements`);
    
    // Verify the data
    console.log('🔍 Verifying data...');
    
    const tables = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    console.log(`📊 Tables: ${tables.rows.map(r => r.name).join(', ')}`);
    
    for (const table of tables.rows) {
      const count = await client.execute(`SELECT COUNT(*) as count FROM ${table.name}`);
      console.log(`   📋 ${table.name}: ${count.rows[0].count} records`);
    }
    
    // Test search functionality
    try {
      const sampleSearch = await client.execute({
        sql: `SELECT ts.text, v.title FROM transcript_segments ts 
              JOIN videos v ON ts.video_id = v.id 
              WHERE ts.text LIKE ? LIMIT 3`,
        args: ['%algorithm%']
      });
      console.log(`🔍 Sample search results: ${sampleSearch.rows.length}`);
      sampleSearch.rows.forEach((row, i) => {
        console.log(`   ${i+1}. "${row.text.substring(0, 60)}..." from "${row.title}"`);
      });
    } catch (error) {
      console.log(`⚠️  Search test failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  }
}

simpleUpload();
