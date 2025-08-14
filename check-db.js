const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkDatabase() {
  console.log('🔍 Checking Database Content');
  console.log('===========================\n');

  const dbPath = path.resolve('./data/transcript_vectors.db');
  console.log(`Database path: ${dbPath}`);

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err.message);
      return;
    }
    console.log('✅ Database opened successfully');
  });

  // Check tables
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('❌ Error getting tables:', err.message);
      return;
    }
    
    console.log('📋 Tables found:', tables.map(t => t.name));
    
    // Check each table content
    tables.forEach(table => {
      db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, result) => {
        if (err) {
          console.error(`❌ Error counting ${table.name}:`, err.message);
        } else {
          console.log(`📊 ${table.name}: ${result.count} rows`);
        }
      });
    });

    // Check if we have any transcript data
    db.all("SELECT * FROM transcript_segments LIMIT 3", (err, segments) => {
      if (err) {
        console.log('⚠️ No transcript_segments table or error:', err.message);
      } else {
        console.log('\n📝 Sample transcript segments:');
        segments.forEach((segment, index) => {
          console.log(`${index + 1}. ${segment.text?.substring(0, 80)}...`);
        });
      }
      
      db.close();
    });
  });
}

checkDatabase();
