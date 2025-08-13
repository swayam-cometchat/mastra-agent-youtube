require('dotenv').config();
const path = require('path');
const YouTubeApiService = require(path.join(__dirname, '../services/youtubeApiService'));
const VectorDatabase = require(path.join(__dirname, '../services/vectorDatabase'));
const RealTranscriptService = require(path.join(__dirname, '../services/realTranscriptService'));
const { OpenAI } = require('openai');

class EnhancedMetadataAgent {
  constructor() {
    this.youtubeApi = new YouTubeApiService(process.env.YOUTUBE_API_KEY);
    this.vectorDb = new VectorDatabase();
    this.realTranscriptService = new RealTranscriptService();
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    console.log('🤖 Enhanced Metadata AI Agent initialized');
    console.log(`🧠 AI Search: ${this.openai ? 'Enabled (OpenAI)' : 'Disabled (add OPENAI_API_KEY)'}`);
    console.log('📝 Real Transcript Support: Enabled (yt-dlp)');
  }

  /**
   * Process playlist with enhanced metadata extraction
   */
  async processPlaylist(playlistUrl, options = {}) {
    const { maxVideos = 50, forceRefresh = false } = options;
    
    console.log(`🎬 Processing playlist with enhanced metadata: ${playlistUrl}`);
    
    try {
      // Check if playlist already exists
      const existingPlaylistId = await this.vectorDb.playlistExists(playlistUrl);
      if (existingPlaylistId && !forceRefresh) {
        const stats = await this.vectorDb.getPlaylistStats(playlistUrl);
        console.log('📋 Playlist already processed. Use forceRefresh=true to reprocess.');
        return {
          success: true,
          message: 'Playlist already processed',
          alreadyProcessed: true,
          ...stats
        };
      }

      // Extract and get playlist details
      const playlistId = this.youtubeApi.extractPlaylistId(playlistUrl);
      const playlistDetails = await this.youtubeApi.getPlaylistDetails(playlistId);
      
      console.log(`📋 Playlist: "${playlistDetails.title}" by ${playlistDetails.channelTitle}`);
      
      // Store playlist
      const playlistDbId = await this.vectorDb.storePlaylist(playlistUrl, playlistDetails.title);
      
      // Get videos with detailed metadata
      const videos = await this.youtubeApi.getPlaylistVideos(playlistId, maxVideos);
      const detailedVideos = await this.youtubeApi.getVideoDetails(videos.map(v => v.videoId));
      
      console.log(`🎥 Processing ${detailedVideos.length} videos with enhanced metadata...`);

      let processedVideos = 0;
      let totalSegments = 0;

      for (const video of detailedVideos) {
        try {
          console.log(`🔄 Processing: ${video.title.substring(0, 60)}...`);
          
          // Store video metadata
          const videoDbId = await this.vectorDb.storeVideo({
            videoId: video.videoId,
            title: video.title,
            description: video.description || '',
            duration: video.durationFormatted || 'Unknown',
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
            publishedAt: video.publishedAt
          }, playlistDbId);

          // Create enhanced content segments
          const contentSegments = await this.createEnhancedSegments(video);
          
          // Store segments with embeddings
          for (const segment of contentSegments) {
            try {
              let embedding = null;
              if (this.openai) {
                embedding = await this.createEmbedding(segment.text);
              }
              
              await this.vectorDb.storeTranscriptSegment(videoDbId, {
                segmentIndex: segment.index,
                text: segment.text,
                startTime: segment.timestamp || 0,
                duration: segment.duration || 0,
                embedding: embedding ? JSON.stringify(embedding) : null
              });
              totalSegments++;
            } catch (embError) {
              console.warn(`⚠️ Failed to create embedding: ${embError.message}`);
            }
          }
          
          processedVideos++;
          console.log(`✅ Created ${contentSegments.length} enhanced segments`);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (videoError) {
          console.error(`❌ Error processing video: ${videoError.message}`);
        }
      }

      const result = {
        success: true,
        playlist: {
          title: playlistDetails.title,
          channelTitle: playlistDetails.channelTitle,
          url: playlistUrl,
          totalVideos: detailedVideos.length
        },
        processing: {
          processedVideos,
          totalSegments,
          hasAI: !!this.openai
        },
        alreadyProcessed: false
      };

      console.log(`🎉 Enhanced processing complete!`);
      console.log(`📊 Summary:`);
      console.log(`   📋 Playlist: ${result.playlist.title}`);
      console.log(`   📹 Videos processed: ${processedVideos}`);
      console.log(`   💬 Enhanced segments: ${totalSegments}`);
      console.log(`   🧠 AI Search: ${this.openai ? 'Enabled' : 'Add OPENAI_API_KEY for AI search'}`);

      return result;

    } catch (error) {
      console.error('❌ Error processing playlist:', error.message);
      throw error;
    }
  }

  /**
   * Create enhanced content segments from video metadata AND real transcripts
   */
  async createEnhancedSegments(video) {
    const segments = [];
    
    // First, try to get REAL transcript using yt-dlp
    console.log(`📝 Attempting to get real transcript for: ${video.videoId}`);
    let realTranscript = [];
    
    try {
      realTranscript = await this.realTranscriptService.getVideoTranscript(video.videoId);
    } catch (transcriptError) {
      console.warn(`⚠️ Real transcript failed: ${transcriptError.message}`);
    }
    
    if (realTranscript.length > 0) {
      console.log(`✅ Got ${realTranscript.length} real transcript segments!`);
      
      // Create segments from REAL transcript (this will find "polynomials"!)
      const transcriptChunks = this.chunkTranscript(realTranscript, 4); // Group every 4 segments
      
      transcriptChunks.forEach((chunk, index) => {
        segments.push({
          index: segments.length,
          text: `Real Transcript: ${chunk.text}`,
          timestamp: chunk.startTime,
          duration: chunk.duration,
          type: 'real_transcript'
        });
      });
      
    } else {
      console.log(`⚠️ No real transcript available, using metadata fallback`);
      
      // Fallback to metadata-based segments
      // Segment 1: Title-based content
      segments.push({
        index: 0,
        text: `Video Title: ${video.title}`,
        timestamp: 0,
        duration: 30,
        type: 'title'
      });
      
      // Segment 2: Description content (broken into chunks)
      if (video.description && video.description.length > 50) {
        const descriptionChunks = this.chunkText(video.description, 500);
        descriptionChunks.forEach((chunk, index) => {
          segments.push({
            index: segments.length,
            text: `Video Description: ${chunk}`,
            timestamp: index * 60, // Approximate timing
            duration: 60,
            type: 'description'
          });
        });
      }
      
      // Segment 3: Enhanced searchable content
      const enhancedContent = this.createSearchableContent(video);
      segments.push({
        index: segments.length,
        text: enhancedContent,
        timestamp: 0,
        duration: video.duration || 600,
        type: 'enhanced'
      });
    }
    
    return segments;
  }

  /**
   * Chunk real transcript segments into meaningful groups
   */
  chunkTranscript(transcript, segmentsPerChunk = 4) {
    const chunks = [];
    
    for (let i = 0; i < transcript.length; i += segmentsPerChunk) {
      const segmentGroup = transcript.slice(i, i + segmentsPerChunk);
      
      const chunkText = segmentGroup.map(seg => seg.text).join(' ');
      const startTime = segmentGroup[0].start;
      const endTime = segmentGroup[segmentGroup.length - 1].start + segmentGroup[segmentGroup.length - 1].duration;
      const duration = endTime - startTime;
      
      chunks.push({
        text: chunkText,
        startTime: startTime,
        duration: duration,
        segmentCount: segmentGroup.length
      });
    }
    
    return chunks;
  }

  /**
   * Create enhanced searchable content
   */
  createSearchableContent(video) {
    let content = `Video: ${video.title}\n\n`;
    
    // Extract key topics from title
    const titleWords = video.title.toLowerCase().split(/\s+/);
    const importantWords = titleWords.filter(word => 
      word.length > 3 && !this.isStopWord(word)
    );
    
    if (importantWords.length > 0) {
      content += `Key Topics: ${importantWords.join(', ')}\n\n`;
    }
    
    // Add description summary
    if (video.description) {
      const sentences = video.description.split(/[.!?]+/).slice(0, 3);
      content += `Summary: ${sentences.join('. ').trim()}\n\n`;
    }
    
    // Add contextual information
    content += `Duration: ${video.durationFormatted || 'Unknown'}\n`;
    content += `Published: ${video.publishedAt}\n`;
    
    return content;
  }

  /**
   * Query with AI-powered search or fallback to keyword search
   */
  async queryPlaylist(playlistUrl, query, options = {}) {
    const { limit = 5, minSimilarity = 0.3 } = options;
    
    console.log(`🎯 Querying playlist for: "${query}"`);
    
    try {
      if (this.openai) {
        return await this.aiQuery(playlistUrl, query, options);
      } else {
        return await this.keywordQuery(playlistUrl, query, options);
      }
    } catch (error) {
      console.error('❌ Error querying playlist:', error.message);
      throw error;
    }
  }

  /**
   * AI-powered semantic search
   */
  async aiQuery(playlistUrl, query, options) {
    const { limit = 5, minSimilarity = 0.3 } = options;
    
    // Create query embedding
    const queryEmbedding = await this.createEmbedding(query);
    
    // Get all segments
    const segments = await this.vectorDb.getPlaylistTranscriptSegments(playlistUrl);
    
    if (segments.length === 0) {
      return {
        success: true,
        query,
        results: [],
        message: "No relevant content found in the playlist."
      };
    }

    // Calculate similarities
    const similarities = [];
    for (const segment of segments) {
      if (segment.embedding) {
        try {
          const segmentEmbedding = JSON.parse(segment.embedding);
          const similarity = this.cosineSimilarity(queryEmbedding, segmentEmbedding);
          
          if (similarity >= minSimilarity) {
            similarities.push({ ...segment, similarity });
          }
        } catch (parseError) {
          // Skip segments with invalid embeddings
        }
      }
    }

    // Sort and format results
    const topResults = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(result => this.formatResult(result, query));

    console.log(`✅ Found ${topResults.length} AI-powered results`);

    return {
      success: true,
      query,
      results: topResults,
      searchType: 'AI-powered semantic search',
      searchStats: {
        totalSegments: segments.length,
        relevantSegments: similarities.length,
        returnedResults: topResults.length
      }
    };
  }

  /**
   * Keyword-based search fallback
   */
  async keywordQuery(playlistUrl, query, options) {
    const { limit = 5 } = options;
    
    const segments = await this.vectorDb.getPlaylistTranscriptSegments(playlistUrl);
    
    if (segments.length === 0) {
      return {
        success: true,
        query,
        results: [],
        message: "No relevant content found in the playlist."
      };
    }

    // Simple keyword matching
    const queryWords = query.toLowerCase().split(/\s+/);
    const matches = [];

    for (const segment of segments) {
      const segmentText = segment.text.toLowerCase();
      let matchScore = 0;
      
      for (const word of queryWords) {
        if (segmentText.includes(word)) {
          matchScore += 1;
        }
      }
      
      if (matchScore > 0) {
        matches.push({
          ...segment,
          similarity: matchScore / queryWords.length
        });
      }
    }

    const topResults = matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(result => this.formatResult(result, query));

    console.log(`✅ Found ${topResults.length} keyword-based results`);

    return {
      success: true,
      query,
      results: topResults,
      searchType: 'Keyword-based search (add OPENAI_API_KEY for AI search)',
      searchStats: {
        totalSegments: segments.length,
        matchedSegments: matches.length,
        returnedResults: topResults.length
      }
    };
  }

  /**
   * Format search result
   */
  formatResult(result, query = '') {
    return {
      video: {
        title: result.video_title,
        videoId: result.video_id,
        url: result.video_url,
        watchUrl: `${result.video_url}&t=${Math.floor(result.start_time)}s`,
        thumbnailUrl: `https://img.youtube.com/vi/${result.video_id}/maxresdefault.jpg`
      },
      content: {
        text: result.text.replace(/^Video (Title|Description): /, ''),
        timestamp: this.formatTimestamp(result.start_time),
        timestampSeconds: Math.floor(result.start_time),
        duration: result.duration
      },
      relevanceScore: this.calculateEnhancedRelevance(result, query),
      confidence: result.similarity > 0.8 ? 'High' : result.similarity > 0.5 ? 'Medium' : 'Low'
    };
  }

  /**
   * Calculate enhanced relevance score combining semantic similarity with exact matches
   */
  calculateEnhancedRelevance(result, query) {
    const semanticScore = result.similarity; // 0-1 range
    const text = result.text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Check for exact word matches (with word boundaries)
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    let exactMatches = 0;
    let partialMatches = 0;
    
    for (const word of queryWords) {
      // Use word boundaries to avoid false matches like "relays" matching "relationship"
      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      
      if (wordRegex.test(text)) {
        exactMatches++;
      } else {
        // Check for fuzzy matches (like "polynomial" vs "polinomial")
        const fuzzyMatch = this.fuzzyWordMatch(word, text);
        if (fuzzyMatch) {
          partialMatches++;
        }
      }
    }
    
    // Calculate boost based on exact matches
    const matchRatio = queryWords.length > 0 ? (exactMatches + partialMatches * 0.8) / queryWords.length : 0;
    
    // Enhanced score calculation
    let enhancedScore = semanticScore;
    
    // Boost for exact/partial matches
    if (matchRatio > 0.5) {
      enhancedScore = Math.min(semanticScore + (matchRatio * 0.4), 1.0);
    }
    
    // Additional boost for high semantic similarity
    if (semanticScore >= 0.4) {
      enhancedScore = Math.min(enhancedScore * 1.3, 1.0);
    }
    
    // Penalize very low semantic scores even if there are word matches
    if (semanticScore < 0.25 && exactMatches === 0) {
      enhancedScore = enhancedScore * 0.7;
    }
    
    return Math.round(enhancedScore * 100) / 100;
  }

  /**
   * Fuzzy word matching for misspellings and variations
   */
  fuzzyWordMatch(queryWord, text) {
    // Look for words that are similar to the query word
    const words = text.split(/\W+/);
    
    for (const textWord of words) {
      if (textWord.length >= queryWord.length - 2 && textWord.length <= queryWord.length + 2) {
        // Calculate Levenshtein-like similarity
        const similarity = this.calculateWordSimilarity(queryWord, textWord);
        if (similarity > 0.8) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calculate word similarity (simple character-based)
   */
  calculateWordSimilarity(word1, word2) {
    const len1 = word1.length;
    const len2 = word2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    let matches = 0;
    const minLen = Math.min(len1, len2);
    
    for (let i = 0; i < minLen; i++) {
      if (word1[i] === word2[i]) {
        matches++;
      }
    }
    
    return matches / maxLen;
  }

  // Helper methods
  async createEmbedding(text) {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000)
    });
    return response.data[0].embedding;
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  chunkText(text, maxLength) {
    const sentences = text.split(/[.!?]+/);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence + '. ';
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  isStopWord(word) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return stopWords.includes(word);
  }

  formatTimestamp(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async close() {
    if (this.vectorDb) {
      await this.vectorDb.close();
    }
    console.log('👋 Enhanced Metadata Agent closed successfully');
  }
}

module.exports = EnhancedMetadataAgent;
