import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class VectorDatabase {
  constructor(dbPath = './data/transcript_vectors.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.initDatabase();
  }

  /**
   * Initialize SQLite database with vector storage tables
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        try {
          fs.mkdirSync(dbDir, { recursive: true });
        } catch (err) {
          console.warn('Could not create db directory, using memory database');
          this.dbPath = ':memory:';
        }
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }
        
        console.log('📁 Connected to SQLite database');
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  /**
   * Create necessary tables for storing transcripts and embeddings
   */
  async createTables() {
    return new Promise((resolve, reject) => {
      const createTablesSQL = `
        CREATE TABLE IF NOT EXISTS playlists (
          id TEXT PRIMARY KEY,
          url TEXT UNIQUE NOT NULL,
          title TEXT,
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (video_id) REFERENCES videos (id)
        );

        CREATE INDEX IF NOT EXISTS idx_videos_playlist ON videos(playlist_id);
        CREATE INDEX IF NOT EXISTS idx_segments_video ON transcript_segments(video_id);
        CREATE INDEX IF NOT EXISTS idx_segments_text ON transcript_segments(text);
      `;

      this.db.exec(createTablesSQL, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('✅ Database tables created successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Store playlist information
   */
  async storePlaylist(playlistUrl, title = null) {
    return new Promise((resolve, reject) => {
      const playlistId = uuidv4();
      const sql = `INSERT OR REPLACE INTO playlists (id, url, title) VALUES (?, ?, ?)`;
      
      this.db.run(sql, [playlistId, playlistUrl, title], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(playlistId);
        }
      });
    });
  }

  /**
   * Store video information
   */
  async storeVideo(videoData, playlistId) {
    return new Promise((resolve, reject) => {
      const videoDbId = uuidv4();
      const sql = `
        INSERT OR REPLACE INTO videos 
        (id, video_id, playlist_id, title, description, duration, url, published_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        videoDbId,
        videoData.videoId,
        playlistId,
        videoData.title,
        videoData.description,
        videoData.duration,
        videoData.url,
        videoData.publishedAt
      ];

      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(videoDbId);
        }
      });
    });
  }

  /**
   * Store transcript segments with embeddings
   */
  async storeTranscriptSegments(videoDbId, transcriptSegments, embeddings = null) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO transcript_segments 
        (id, video_id, segment_index, text, start_time, duration, embedding) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      let processed = 0;
      const total = transcriptSegments.length;

      transcriptSegments.forEach((segment, index) => {
        const segmentId = uuidv4();
        const embedding = embeddings && embeddings[index] ? JSON.stringify(embeddings[index]) : null;
        
        stmt.run([
          segmentId,
          videoDbId,
          index,
          segment.text,
          segment.start,
          segment.duration,
          embedding
        ], (err) => {
          if (err) {
            console.error(`Error storing segment ${index}:`, err);
          }
          
          processed++;
          if (processed === total) {
            stmt.finalize();
            resolve(processed);
          }
        });
      });

      if (total === 0) {
        stmt.finalize();
        resolve(0);
      }
    });
  }

  /**
   * Search transcript segments using text similarity
   */
  async searchTranscripts(query, limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          ts.id,
          ts.text,
          ts.start_time,
          ts.duration,
          ts.segment_index,
          v.video_id,
          v.title as video_title,
          v.url as video_url,
          v.duration as video_duration,
          v.published_at
        FROM transcript_segments ts
        JOIN videos v ON ts.video_id = v.id
        WHERE ts.text LIKE ?
        ORDER BY 
          LENGTH(ts.text) - LENGTH(REPLACE(UPPER(ts.text), UPPER(?), '')) DESC,
          ts.start_time ASC
        LIMIT ?
      `;

      const searchPattern = `%${query}%`;
      
      this.db.all(sql, [searchPattern, query, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(this.formatSearchResults(rows, query));
        }
      });
    });
  }

  /**
   * Get all videos in a playlist
   */
  async getPlaylistVideos(playlistUrl) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT v.*, p.url as playlist_url 
        FROM videos v 
        JOIN playlists p ON v.playlist_id = p.id 
        WHERE p.url = ?
      `;
      
      this.db.all(sql, [playlistUrl], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Check if playlist exists in database
   */
  async playlistExists(playlistUrl) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id FROM playlists WHERE url = ?`;
      
      this.db.get(sql, [playlistUrl], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.id : null);
        }
      });
    });
  }

  /**
   * Get transcript segments for a video
   */
  async getVideoTranscripts(videoId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM transcript_segments 
        WHERE video_id = (SELECT id FROM videos WHERE video_id = ?)
        ORDER BY segment_index ASC
      `;
      
      this.db.all(sql, [videoId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Format search results for consistent output
   */
  formatSearchResults(rows, query) {
    const videoGroups = {};
    
    rows.forEach(row => {
      if (!videoGroups[row.video_id]) {
        videoGroups[row.video_id] = {
          videoId: row.video_id,
          title: row.video_title,
          url: row.video_url,
          duration: row.video_duration,
          publishedAt: row.published_at,
          matchingSegments: []
        };
      }
      
      videoGroups[row.video_id].matchingSegments.push({
        text: row.text,
        timestamp: row.start_time,
        duration: row.duration,
        segmentIndex: row.segment_index,
        confidence: this.calculateTextSimilarity(row.text, query)
      });
    });

    return Object.values(videoGroups).map(video => ({
      video: video,
      matchingSegments: video.matchingSegments,
      relevanceScore: this.calculateVideoRelevance(video.matchingSegments, query)
    }));
  }

  /**
   * Calculate text similarity score
   */
  calculateTextSimilarity(text, query) {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    let matches = 0;
    queryWords.forEach(word => {
      if (textLower.includes(word)) {
        matches++;
      }
    });
    
    return matches / queryWords.length;
  }

  /**
   * Calculate video relevance score
   */
  calculateVideoRelevance(segments, query) {
    if (segments.length === 0) return 0;
    
    const avgConfidence = segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length;
    const segmentBonus = Math.min(segments.length / 5, 1); // Bonus for multiple matches
    
    return Math.min(avgConfidence + (segmentBonus * 0.2), 1);
  }

  /**
   * Get all transcript segments for debugging
   */
  async getAllTranscriptSegments() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          ts.id,
          ts.text as segment_text,
          ts.segment_index,
          ts.start_time,
          ts.duration,
          v.title as video_title,
          v.video_id,
          v.description as video_description
        FROM transcript_segments ts
        JOIN videos v ON ts.video_id = v.id
        ORDER BY v.title, ts.segment_index
      `;
      
      this.db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          (SELECT COUNT(*) FROM playlists) as playlists,
          (SELECT COUNT(*) FROM videos) as videos,
          (SELECT COUNT(*) FROM transcript_segments) as segments
      `;
      
      this.db.get(sql, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Store a single transcript segment with embedding
   */
  async storeTranscriptSegment(videoId, segmentData) {
    return new Promise((resolve, reject) => {
      const segmentId = uuidv4();
      const sql = `
        INSERT INTO transcript_segments 
        (id, video_id, segment_index, text, start_time, duration, embedding)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        segmentId,
        videoId,
        segmentData.segmentIndex,
        segmentData.text,
        segmentData.startTime,
        segmentData.duration,
        segmentData.embedding
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(segmentId);
        }
      });
    });
  }

  /**
   * Get all transcript segments for a playlist with video metadata
   */
  async getPlaylistTranscriptSegments(playlistUrl) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          ts.id,
          ts.text,
          ts.start_time,
          ts.duration,
          ts.embedding,
          v.video_id,
          v.title as video_title,
          v.url as video_url
        FROM transcript_segments ts
        JOIN videos v ON ts.video_id = v.id
        JOIN playlists p ON v.playlist_id = p.id
        WHERE p.url = ?
        ORDER BY v.published_at, ts.start_time
      `;
      
      this.db.all(sql, [playlistUrl], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get playlist statistics
   */
  async getPlaylistStats(playlistUrl) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          p.title as playlist_title,
          p.url as playlist_url,
          COUNT(DISTINCT v.id) as total_videos,
          COUNT(DISTINCT CASE WHEN ts.id IS NOT NULL THEN v.id END) as videos_with_transcripts,
          COUNT(ts.id) as total_segments
        FROM playlists p
        LEFT JOIN videos v ON p.id = v.playlist_id
        LEFT JOIN transcript_segments ts ON v.id = ts.video_id
        WHERE p.url = ?
        GROUP BY p.id
      `;
      
      this.db.get(sql, [playlistUrl], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? {
            playlist: {
              title: row.playlist_title,
              url: row.playlist_url
            },
            videos: row.total_videos || 0,
            videosWithTranscripts: row.videos_with_transcripts || 0,
            segments: row.total_segments || 0
          } : null);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('📁 Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default VectorDatabase;
