import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);
import fs from 'fs/promises';
import path from 'path';

class RealTranscriptService {
  constructor() {
    this.tempDir = '/tmp/youtube-transcripts';
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Get real transcript for a video using yt-dlp
   */
  async getVideoTranscript(videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const outputPath = path.join(this.tempDir, videoId);
    
    try {
      console.log(`📝 Fetching real transcript for: ${videoId}`);
      
      // Use yt-dlp to get English auto-generated subtitles
      const command = `yt-dlp --write-auto-sub --sub-lang en --skip-download --output "${outputPath}.%(ext)s" "${videoUrl}"`;
      
      await execAsync(command, { timeout: 30000 });
      
      // Look for the subtitle file
      const vttFile = `${outputPath}.en.vtt`;
      const srtFile = `${outputPath}.en.srt`;
      
      let subtitleFile = null;
      try {
        await fs.access(vttFile);
        subtitleFile = vttFile;
      } catch {
        try {
          await fs.access(srtFile);
          subtitleFile = srtFile;
        } catch {
          throw new Error('No subtitle file found');
        }
      }
      
      // Read and parse the subtitle file
      const subtitleContent = await fs.readFile(subtitleFile, 'utf8');
      const transcript = this.parseSubtitles(subtitleContent);
      
      // Clean up the file
      try {
        await fs.unlink(subtitleFile);
      } catch {
        // Ignore cleanup errors
      }
      
      console.log(`✅ Extracted ${transcript.length} transcript segments`);
      return transcript;
      
    } catch (error) {
      console.warn(`⚠️ Could not get transcript for ${videoId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse VTT or SRT subtitle format into transcript segments
   */
  parseSubtitles(content) {
    const segments = [];
    
    if (content.includes('WEBVTT')) {
      // Parse VTT format
      const blocks = content.split('\n\n').filter(block => block.trim());
      
      for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length >= 2 && lines[0].includes('-->')) {
          const timeLine = lines[0];
          const text = lines.slice(1).join(' ').trim();
          if (text && !text.startsWith('WEBVTT') && !text.startsWith('NOTE')) {
            const startTime = this.parseVTTTime(timeLine.split(' --> ')[0]);
            const endTime = this.parseVTTTime(timeLine.split(' --> ')[1]);
            segments.push({
              text: text.replace(/<[^>]*>/g, ''), // Remove HTML tags
              start: startTime,
              end: endTime,
              duration: endTime - startTime,
              offset: startTime * 1000 // For compatibility
            });
          }
        }
      }
    } else {
      // Parse SRT format
      const blocks = content.split('\n\n').filter(block => block.trim());
      
      for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length >= 3 && lines[1].includes('-->')) {
          const timeLine = lines[1];
          const text = lines.slice(2).join(' ').trim();
          
          if (text) {
            const startTime = this.parseSRTTime(timeLine.split(' --> ')[0]);
            const endTime = this.parseSRTTime(timeLine.split(' --> ')[1]);
            segments.push({
              text: text.replace(/<[^>]*>/g, ''), // Remove HTML tags
              start: startTime,
              end: endTime,
              duration: endTime - startTime,
              offset: startTime * 1000 // For compatibility
            });
          }
        }
      }
    }
    
    return segments;
  }

  /**
   * Parse VTT timestamp (00:00:10.500)
   */
  parseVTTTime(timeStr) {
    const parts = timeStr.trim().split(':');
    const secondsParts = parts[2].split('.');
    
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(secondsParts[0]) || 0;
    const milliseconds = parseInt(secondsParts[1]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  /**
   * Parse SRT timestamp (00:00:10,500)
   */
  parseSRTTime(timeStr) {
    const parts = timeStr.trim().split(':');
    const secondsParts = parts[2].split(',');
    
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(secondsParts[0]) || 0;
    const milliseconds = parseInt(secondsParts[1]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }
}

export default RealTranscriptService;
