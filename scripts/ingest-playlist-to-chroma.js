
import dotenv from 'dotenv';
dotenv.config();
import { CloudClient } from 'chromadb';
import YouTubeApiService from '../src/services/youtubeApiService.js';
import RealTranscriptService from '../src/services/realTranscriptService.js';

const CHROMA_CLOUD_API_KEY = process.env.CHROMA_CLOUD_API_KEY;
const CHROMA_TENANT = process.env.CHROMA_TENANT;
const CHROMA_DATABASE = process.env.CHROMA_DATABASE;
const CHROMA_COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || 'youtube_transcripts_complete';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const playlistUrl = 'https://www.youtube.com/watch?v=tpIctyqH29Q&list=PL8dPuuaLjXtNlUrzyH5r6jN9ulIgZBpdo';

async function ingestPlaylist() {
  if (!CHROMA_CLOUD_API_KEY || !CHROMA_TENANT || !CHROMA_DATABASE) {
    console.error('❌ Missing Chroma Cloud credentials in .env');
    process.exit(1);
  }
  if (!YOUTUBE_API_KEY) {
    console.error('❌ Missing YOUTUBE_API_KEY in .env');
    process.exit(1);
  }

  const youtubeApi = new YouTubeApiService(YOUTUBE_API_KEY);
  const transcriptService = new RealTranscriptService();
  const client = new CloudClient({
    apiKey: CHROMA_CLOUD_API_KEY,
    tenantId: CHROMA_TENANT,
    database: CHROMA_DATABASE,
  });
  const collection = await client.getOrCreateCollection({ name: CHROMA_COLLECTION_NAME });

  // 1. Get all videos in playlist
  const playlistId = youtubeApi.extractPlaylistId(playlistUrl);
  const videos = await youtubeApi.getPlaylistVideos(playlistId, 1000); // Increase max if needed
  console.log(`Found ${videos.length} videos in playlist.`);

  // 2. For each video, fetch transcript and upload to Chroma
  for (const video of videos) {
    console.log(`\n🎬 Processing: ${video.title} (${video.videoId})`);
    const segments = await transcriptService.getVideoTranscript(video.videoId);

    if (!segments.length) {
      console.warn(`⚠️ No transcript found for ${video.title}`);
      continue;
    }

    // Limit to 300 segments per video to avoid Chroma Cloud quota errors
    const MAX_SEGMENTS = 300;
    const limitedSegments = segments.slice(0, MAX_SEGMENTS);
    const ids = limitedSegments.map((seg, idx) => `${video.videoId}-${idx}`);
    const documents = limitedSegments.map(seg => seg.text);
    const metadatas = limitedSegments.map((seg, idx) => ({
      videoId: video.videoId,
      videoTitle: video.title,
      videoUrl: video.url,
      start: seg.start,
      end: seg.end,
      duration: seg.duration,
    }));

    // Upload to Chroma
    await collection.add({
      ids,
      documents,
      metadatas,
    });
    console.log(`✅ Uploaded ${documents.length} segments for ${video.title} (limited to ${MAX_SEGMENTS} if more)`);
  }
}

ingestPlaylist().catch(console.error);
