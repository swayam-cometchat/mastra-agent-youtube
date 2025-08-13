import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DeployableVectorDatabase {
  constructor(options = {}) {
    // Support both local and remote database configurations
    this.isRemote = !!process.env.DATABASE_URL;
    this.tunnelUrl = process.env.NGROK_DATABASE_URL;
    
    if (this.isRemote && this.tunnelUrl) {
      console.log('🌐 Using remote database via ngrok tunnel');
      this.dbPath = process.env.DATABASE_URL;
    } else {
      console.log('💾 Using local SQLite database');
      this.dbPath = options.dbPath || join(dirname(__dirname), '..', 'data', 'transcript_vectors.db');
    }
    
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        if (this.isRemote) {
          // For remote databases, you might use a different connector
          // For now, we'll keep SQLite for simplicity but make it tunnel-ready
          console.log('🔗 Connecting to tunneled database...');
        }
        
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('❌ Database connection error:', err);
            reject(err);
          } else {
            console.log('📁 Connected to database successfully');
            this.isConnected = true;
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createTablesSQL = `
        CREATE TABLE IF NOT EXISTS playlists (
          id TEXT PRIMARY KEY,
          url TEXT UNIQUE NOT NULL,
          title TEXT,
          channel_title TEXT,
          total_videos INTEGER DEFAULT 0,
          processed_videos INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          video_id TEXT UNIQUE NOT NULL,
          playlist_id TEXT,
          title TEXT,
          description TEXT,
          duration TEXT,
          url TEXT,
          published_at TEXT,
          thumbnail_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (playlist_id) REFERENCES playlists (id)
        );

        CREATE TABLE IF NOT EXISTS transcript_segments (
          id TEXT PRIMARY KEY,
          video_id TEXT NOT NULL,
          segment_index INTEGER,
          text TEXT NOT NULL,
          start_time REAL,
          duration REAL,
          embedding TEXT, -- JSON string of vector embedding
          similarity_score REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (video_id) REFERENCES videos (id)
        );

        CREATE INDEX IF NOT EXISTS idx_videos_playlist ON videos(playlist_id);
        CREATE INDEX IF NOT EXISTS idx_segments_video ON transcript_segments(video_id);
        CREATE INDEX IF NOT EXISTS idx_segments_text ON transcript_segments(text);
        CREATE INDEX IF NOT EXISTS idx_segments_similarity ON transcript_segments(similarity_score);
        CREATE INDEX IF NOT EXISTS idx_playlists_url ON playlists(url);
      `;

      this.db.exec(createTablesSQL, (err) => {
        if (err) {
          console.error('❌ Error creating tables:', err);
          reject(err);
        } else {
          console.log('✅ Database tables created/verified successfully');
          resolve();
        }
      });
    });
  }

  // Add method to get database info for ngrok setup
  getDatabaseInfo() {
    return {
      type: this.isRemote ? 'remote' : 'local',
      path: this.dbPath,
      tunnelUrl: this.tunnelUrl,
      isConnected: this.isConnected,
      ngrokReady: !!this.tunnelUrl
    };
  }

  // Method to backup database for deployment
  async createBackup() {
    if (!this.isRemote) {
      const backupPath = this.dbPath.replace('.db', '_backup.db');
      console.log(`💾 Creating database backup: ${backupPath}`);
      // Implementation would depend on your backup strategy
      return backupPath;
    }
  }

  // All other methods from the original VectorDatabase class...
  // (copy the rest of the methods from your existing vectorDatabase.js)
  
  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err);
          } else {
            console.log('📁 Database connection closed');
          }
          this.isConnected = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export { DeployableVectorDatabase };
