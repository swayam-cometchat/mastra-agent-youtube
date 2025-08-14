#!/usr/bin/env node

// Upload script to import data to Turso database
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

async function uploadToTurso() {
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
    
    console.log('📂 Reading SQL export file...');
    const sqlContent = readFileSync('transcript_vectors_export.sql', 'utf8');
    
    console.log('🔀 Splitting SQL statements...');
    // Split by semicolon and filter out empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements`);
    
    console.log('⚡ Executing statements in batches...');
    let executed = 0;
    const batchSize = 50;
    
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      
      for (const statement of batch) {
        try {
          await client.execute(statement + ';');
          executed++;
          
          if (executed % 100 === 0) {
            console.log(`   ✅ Executed ${executed}/${statements.length} statements`);
          }
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.log(`   ⚠️  Skipped statement: ${error.message.substring(0, 50)}...`);
          }
        }
      }
    }
    
    console.log(`🎉 Upload complete! Executed ${executed} statements`);
    
    // Verify the data
    console.log('🔍 Verifying data...');
    const count = await client.execute('SELECT COUNT(*) as count FROM transcript_segments');
    console.log(`📝 Transcript segments: ${count.rows[0].count}`);
    
    const videoCount = await client.execute('SELECT COUNT(*) as count FROM videos');
    console.log(`🎬 Videos: ${videoCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  }
}

uploadToTurso();
