const { google } = require('googleapis');
const YouTubeOAuth2Service = require('./youtubeOAuth2Service');

class YouTubeApiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
    this.oauth2Service = new YouTubeOAuth2Service();
    console.log('🔑 YouTube API service initialized');
  }

  /**
   * Extract playlist ID from various YouTube URL formats
   */
  extractPlaylistId(url) {
    const patterns = [
      /[&?]list=([a-zA-Z0-9_-]+)/,
      /playlist\?list=([a-zA-Z0-9_-]+)/,
      /embed\/videoseries\?list=([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    throw new Error('Invalid YouTube playlist URL');
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    throw new Error('Invalid YouTube video URL');
  }

  /**
   * Get playlist details
   */
  async getPlaylistDetails(playlistId) {
    try {
      console.log(`📋 Fetching playlist details for: ${playlistId}`);
      
      const response = await this.youtube.playlists.list({
        part: ['snippet', 'contentDetails'],
        id: [playlistId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Playlist not found or is private');
      }

      const playlist = response.data.items[0];
      return {
        id: playlist.id,
        title: playlist.snippet.title,
        description: playlist.snippet.description,
        channelTitle: playlist.snippet.channelTitle,
        videoCount: playlist.contentDetails.itemCount,
        publishedAt: playlist.snippet.publishedAt,
        thumbnails: playlist.snippet.thumbnails
      };
    } catch (error) {
      console.error('❌ Error fetching playlist details:', error.message);
      throw error;
    }
  }

  /**
   * Get all videos from a playlist
   */
  async getPlaylistVideos(playlistId, maxResults = 50) {
    try {
      console.log(`📹 Fetching videos from playlist: ${playlistId}`);
      
      let allVideos = [];
      let nextPageToken = null;

      do {
        const response = await this.youtube.playlistItems.list({
          part: ['snippet', 'contentDetails'],
          playlistId: playlistId,
          maxResults: Math.min(maxResults - allVideos.length, 50),
          pageToken: nextPageToken
        });

        const videos = response.data.items
          .filter(item => item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video')
          .map(item => ({
            videoId: item.contentDetails.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt,
            channelTitle: item.snippet.channelTitle,
            thumbnails: item.snippet.thumbnails,
            position: item.snippet.position,
            url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`
          }));

        allVideos = allVideos.concat(videos);
        nextPageToken = response.data.nextPageToken;

        console.log(`✅ Fetched ${allVideos.length} videos so far...`);

      } while (nextPageToken && allVideos.length < maxResults);

      console.log(`📊 Total videos fetched: ${allVideos.length}`);
      return allVideos;
    } catch (error) {
      console.error('❌ Error fetching playlist videos:', error.message);
      throw error;
    }
  }

  /**
   * Get video details including duration
   */
  async getVideoDetails(videoIds) {
    try {
      if (!Array.isArray(videoIds)) {
        videoIds = [videoIds];
      }

      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds.join(',')
      });

      return response.data.items.map(video => ({
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        duration: this.parseDuration(video.contentDetails.duration),
        durationFormatted: this.formatDuration(this.parseDuration(video.contentDetails.duration)),
        publishedAt: video.snippet.publishedAt,
        channelTitle: video.snippet.channelTitle,
        viewCount: parseInt(video.statistics.viewCount || 0),
        likeCount: parseInt(video.statistics.likeCount || 0),
        tags: video.snippet.tags || [],
        categoryId: video.snippet.categoryId,
        thumbnails: video.snippet.thumbnails,
        url: `https://www.youtube.com/watch?v=${video.id}`
      }));
    } catch (error) {
      console.error('❌ Error fetching video details:', error.message);
      throw error;
    }
  }

  /**
   * Get video transcript using OAuth2 captions API first, then fallback methods
   */
  async getVideoTranscript(videoId) {
    try {
      console.log(`📝 Fetching transcript for video: ${videoId}`);
      
      // Method 1: Try OAuth2 captions API first (best quality)
      if (this.oauth2Service.isOAuth2Authenticated()) {
        console.log('🔐 Trying OAuth2 captions API...');
        
        const oauth2Transcript = await this.oauth2Service.getVideoCaptions(videoId);
        
        if (oauth2Transcript && oauth2Transcript.length > 0) {
          console.log(`✅ OAuth2 transcript fetched: ${oauth2Transcript.length} segments`);
          return oauth2Transcript;
        } else {
          console.log('⚠️ OAuth2 method found no captions, trying alternative methods...');
        }
      } else {
        console.log('ℹ️ OAuth2 not authenticated, using alternative methods...');
      }
      
      // Method 2: Fallback to alternative transcript service (metadata-based)
      const transcript = await this.alternativeTranscript.getVideoTranscript(videoId);
      
      if (transcript && transcript.length > 0) {
        console.log(`✅ Alternative transcript fetched: ${transcript.length} segments`);
        return transcript;
      } else {
        console.warn(`⚠️ No transcript available for video: ${videoId}`);
        return [];
      }
      
    } catch (error) {
      console.error(`❌ Error fetching transcript for ${videoId}:`, error.message);
      return [];
    }
  }

  /**
   * Process complete playlist with videos and transcripts
   */
  async processPlaylist(playlistUrl, options = {}) {
    const {
      maxVideos = 50,
      includeTranscripts = true,
      batchSize = 5
    } = options;

    console.log(`🎬 Processing playlist: ${playlistUrl}`);
    console.log(`📊 Settings: maxVideos=${maxVideos}, includeTranscripts=${includeTranscripts}, batchSize=${batchSize}`);
    
    try {
      // Extract playlist ID and get details
      const playlistId = this.extractPlaylistId(playlistUrl);
      const playlistDetails = await this.getPlaylistDetails(playlistId);
      
      console.log(`📋 Playlist: "${playlistDetails.title}"`);
      console.log(`📊 Total videos in playlist: ${playlistDetails.videoCount}`);
      console.log(`👤 Channel: ${playlistDetails.channelTitle}`);

      // Get all videos in playlist
      const videos = await this.getPlaylistVideos(playlistId, maxVideos);
      console.log(`📹 Processing ${videos.length} videos...`);

      // Get detailed video information in batches
      const detailedVideos = [];
      for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize);
        const videoIds = batch.map(v => v.videoId);
        
        try {
          console.log(`⏳ Processing video batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(videos.length/batchSize)}...`);
          const details = await this.getVideoDetails(videoIds);
          
          // Merge playlist info with detailed info
          const mergedVideos = batch.map(video => {
            const detail = details.find(d => d.videoId === video.videoId);
            return detail ? { ...video, ...detail } : video;
          });
          
          detailedVideos.push(...mergedVideos);
          console.log(`✅ Batch completed: ${mergedVideos.length} videos processed`);
          
          // Small delay to respect rate limits
          await this.delay(200);
        } catch (error) {
          console.error(`❌ Error processing batch ${i}-${i+batchSize}:`, error.message);
          // Continue with next batch
        }
      }

      // Add transcripts if requested
      if (includeTranscripts) {
        console.log(`📝 Fetching transcripts for ${detailedVideos.length} videos...`);
        
        let transcriptCount = 0;
        for (let i = 0; i < detailedVideos.length; i++) {
          const video = detailedVideos[i];
          try {
            console.log(`📝 Processing transcript ${i + 1}/${detailedVideos.length}: ${video.title}`);
            video.transcript = await this.getVideoTranscript(video.videoId);
            
            if (video.transcript.length > 0) {
              transcriptCount++;
              console.log(`✅ Transcript: ${video.transcript.length} segments`);
            } else {
              console.log(`⚠️ No transcript available`);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to get transcript: ${error.message}`);
            video.transcript = [];
          }
          
          // Add delay to avoid rate limiting
          if (i < detailedVideos.length - 1) {
            await this.delay(300); // Slightly longer delay for transcript requests
          }
        }
        
        console.log(`📊 Transcripts obtained: ${transcriptCount}/${detailedVideos.length} videos`);
      }

      const result = {
        playlist: playlistDetails,
        videos: detailedVideos,
        totalVideos: detailedVideos.length,
        videosWithTranscripts: detailedVideos.filter(v => v.transcript && v.transcript.length > 0).length,
        processingStats: {
          requestedMaxVideos: maxVideos,
          actualVideosProcessed: detailedVideos.length,
          transcriptsObtained: detailedVideos.filter(v => v.transcript && v.transcript.length > 0).length
        }
      };

      console.log(`🎉 Playlist processing complete!`);
      console.log(`📊 Final stats: ${result.totalVideos} videos, ${result.videosWithTranscripts} with transcripts`);

      return result;

    } catch (error) {
      console.error('❌ Error processing playlist:', error.message);
      throw error;
    }
  }

  /**
   * Parse YouTube duration format (PT1M30S) to seconds
   */
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format duration in seconds to readable format
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Add delay for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search YouTube videos (bonus feature)
   */
  async searchVideos(query, maxResults = 10) {
    try {
      console.log(`🔍 Searching YouTube for: "${query}"`);
      
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        maxResults: maxResults,
        videoCaption: 'closedCaption' // Prefer videos with captions
      });

      const results = response.data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        thumbnails: item.snippet.thumbnails,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));

      console.log(`✅ Found ${results.length} videos`);
      return results;
    } catch (error) {
      console.error('❌ Error searching videos:', error.message);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      console.log('🔍 Testing YouTube API connection...');
      
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: 'test',
        type: ['video'],
        maxResults: 1
      });

      console.log('✅ YouTube API connection successful!');
      return true;
    } catch (error) {
      console.error('❌ YouTube API connection failed:', error.message);
      return false;
    }
  }
}

module.exports = YouTubeApiService;
