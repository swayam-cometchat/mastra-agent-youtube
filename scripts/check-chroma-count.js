import dotenv from 'dotenv';
dotenv.config();
import { CloudClient } from 'chromadb';

const CHROMA_CLOUD_API_KEY = process.env.CHROMA_CLOUD_API_KEY;
const CHROMA_TENANT = process.env.CHROMA_TENANT;
const CHROMA_DATABASE = process.env.CHROMA_DATABASE;
const CHROMA_COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || 'youtube_transcripts_complete';

if (!CHROMA_CLOUD_API_KEY || !CHROMA_TENANT || !CHROMA_DATABASE) {
  console.error('❌ Missing Chroma Cloud credentials in .env');
  process.exit(1);
}

async function checkChromaCount() {
  const client = new CloudClient({
    apiKey: CHROMA_CLOUD_API_KEY,
    tenantId: CHROMA_TENANT,
    database: CHROMA_DATABASE,
  });
  const collection = await client.getOrCreateCollection({ name: CHROMA_COLLECTION_NAME });
  const count = await collection.count();
  console.log(`Chroma Cloud collection "${CHROMA_COLLECTION_NAME}" contains ${count} segments.`);
}

checkChromaCount().catch(console.error);
