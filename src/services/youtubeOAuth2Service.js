require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

/**
 * YouTube OAuth2 Service for accessing captions and other authenticated APIs
 */
class YouTubeOAuth2Service {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
    );
    
    this.youtube = null;
    this.tokenPath = path.join(__dirname, '../../data/youtube_tokens.json');
    this.isAuthenticated = false;
    this._initialized = false;
    
    // Load existing tokens on initialization (async)
    this.loadTokens().then(() => {
      this._initialized = true;
    });
  }

  /**
   * Ensure OAuth2 service is initialized
   */
  async ensureInitialized() {
    if (!this._initialized) {
      await this.loadTokens();
      this._initialized = true;
    }
  }

  /**
   * Generate OAuth2 authorization URL
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code) {
    try {
      const response = await this.oauth2Client.getToken(code);
      const tokens = response.tokens;
      
      this.oauth2Client.setCredentials(tokens);
      
      // Save tokens to file
      await this.saveTokens(tokens);
      
      // Initialize YouTube API client
      this.youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client
      });
      
      this.isAuthenticated = true;
      console.log('✅ OAuth2 authentication successful!');
      
      return tokens;
    } catch (error) {
      console.error('❌ Error exchanging code for tokens:', error.message);
      throw error;
    }
  }

  /**
   * Load tokens from file
   */
  async loadTokens() {
    try {
      const tokenData = await fs.readFile(this.tokenPath, 'utf8');
      const tokens = JSON.parse(tokenData);
      
      this.oauth2Client.setCredentials(tokens);
      
      // Initialize YouTube API client
      this.youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client
      });
      
      this.isAuthenticated = true;
      console.log('✅ OAuth2 tokens loaded successfully');
      
      // Check if tokens need refresh
      await this.refreshTokensIfNeeded();
      
    } catch (error) {
      console.log('ℹ️ No existing OAuth2 tokens found');
      this.isAuthenticated = false;
    }
  }

  /**
   * Save tokens to file
   */
  async saveTokens(tokens) {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.tokenPath);
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
      console.log('💾 OAuth2 tokens saved');
    } catch (error) {
      console.error('❌ Error saving tokens:', error.message);
    }
  }

  /**
   * Refresh tokens if needed
   */
  async refreshTokensIfNeeded() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      await this.saveTokens(credentials);
      console.log('🔄 OAuth2 tokens refreshed');
    } catch (error) {
      console.log('ℹ️ Token refresh not needed or failed:', error.message);
    }
  }

  /**
   * Get video captions using OAuth2
   */
  async getVideoCaptions(videoId) {
    if (!this.isAuthenticated) {
      throw new Error('OAuth2 authentication required. Please authenticate first.');
    }

    try {
      console.log(`📝 Fetching captions for video: ${videoId} (OAuth2)`);
      
      // List available caption tracks
      const captionsListResponse = await this.youtube.captions.list({
        part: ['snippet'],
        videoId: videoId
      });

      if (!captionsListResponse.data.items || captionsListResponse.data.items.length === 0) {
        console.log('❌ No caption tracks found for this video');
        return [];
      }

      console.log(`✅ Found ${captionsListResponse.data.items.length} caption tracks`);
      
      // Find English caption track
      let englishTrack = captionsListResponse.data.items.find(track => 
        track.snippet.language === 'en' || track.snippet.language === 'en-US'
      );
      
      // If no English track, use the first available track
      if (!englishTrack) {
        englishTrack = captionsListResponse.data.items[0];
        console.log(`⚠️ No English captions found, using: ${englishTrack.snippet.language}`);
      } else {
        console.log(`✅ Using English captions: ${englishTrack.snippet.language}`);
      }

      // Download caption content
      const captionResponse = await this.youtube.captions.download({
        id: englishTrack.id,
        tfmt: 'srt' // Request SRT format for easier parsing
      });

      if (captionResponse.data) {
        console.log('✅ Caption content downloaded successfully');
        
        // Parse SRT format to transcript segments
        const transcript = this.parseSRTCaptions(captionResponse.data);
        console.log(`📝 Parsed ${transcript.length} caption segments`);
        
        return transcript;
      } else {
        console.log('❌ No caption content received');
        return [];
      }

    } catch (error) {
      console.error(`❌ Error fetching captions for ${videoId}:`, error.message);
      
      // If quota exceeded or auth failed, we might need to re-authenticate
      if (error.message.includes('quotaExceeded') || error.message.includes('unauthorized')) {
        console.log('⚠️ May need to re-authenticate or check quota');
      }
      
      return [];
    }
  }

  /**
   * Parse SRT format captions to transcript segments
   */
  parseSRTCaptions(srtContent) {
    const segments = [];
    
    try {
      // Split SRT content into blocks
      const blocks = srtContent.split('\n\n').filter(block => block.trim());
      
      for (const block of blocks) {
        const lines = block.trim().split('\n');
        
        if (lines.length >= 3) {
          // Parse timing line (format: 00:00:01,000 --> 00:00:04,000)
          const timingLine = lines[1];
          const timingMatch = timingLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
          
          if (timingMatch) {
            const startTime = this.timeToSeconds(timingMatch[1], timingMatch[2], timingMatch[3], timingMatch[4]);
            const endTime = this.timeToSeconds(timingMatch[5], timingMatch[6], timingMatch[7], timingMatch[8]);
            
            // Combine all text lines (some captions span multiple lines)
            const text = lines.slice(2).join(' ').replace(/<[^>]*>/g, '').trim();
            
            if (text) {
              segments.push({
                text: text,
                start: startTime,
                duration: endTime - startTime
              });
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error parsing SRT captions:', error.message);
    }
    
    return segments;
  }

  /**
   * Convert time components to seconds
   */
  timeToSeconds(hours, minutes, seconds, milliseconds) {
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
  }

  /**
   * Check if OAuth2 is authenticated
   */
  isOAuth2Authenticated() {
    return this.isAuthenticated;
  }

  /**
   * Get authentication status and next steps
   */
  getAuthStatus() {
    if (this.isAuthenticated) {
      return {
        authenticated: true,
        message: 'OAuth2 authentication active - can access real captions'
      };
    } else {
      return {
        authenticated: false,
        message: 'OAuth2 authentication required',
        authUrl: this.getAuthUrl(),
        instructions: [
          '1. Open the provided auth URL in your browser',
          '2. Sign in with your Google account',
          '3. Grant permissions to access YouTube',
          '4. Copy the authorization code from the redirect URL',
          '5. Use the code to complete authentication'
        ]
      };
    }
  }
}

module.exports = YouTubeOAuth2Service;
