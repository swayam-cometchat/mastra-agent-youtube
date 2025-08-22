import dotenv from 'dotenv';
dotenv.config();
import { CloudClient } from 'chromadb';
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

const CHROMA_CLOUD_API_KEY = process.env.CHROMA_CLOUD_API_KEY;
const CHROMA_TENANT = process.env.CHROMA_TENANT;
const CHROMA_DATABASE = process.env.CHROMA_DATABASE;
const CHROMA_COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || 'youtube_transcripts_complete';

if (!CHROMA_CLOUD_API_KEY || !CHROMA_TENANT || !CHROMA_DATABASE) {
  console.error('❌ Missing Chroma Cloud credentials in .env');
  process.exit(1);
}

async function clearChromaCollection() {
  const client = new CloudClient({
    apiKey: CHROMA_CLOUD_API_KEY,
    tenantId: CHROMA_TENANT,
    database: CHROMA_DATABASE,
  });
const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
    dimensions: 384,
  });
  const collection = await client.getOrCreateCollection({
    name: CHROMA_COLLECTION_NAME,
    embeddingFunction: embedder,
    metadata: { "hnsw:space": "cosine" },
  });
  const count = await collection.count();
  if (count === 0) {
    console.log('✅ Collection is already empty.');
    return;
  }
  console.log(`⚠️ Deleting all ${count} segments from collection "${CHROMA_COLLECTION_NAME}"...`);
  // Fetch all IDs in batches and delete
  let offset = 0;
  const batchSize = 100;
  while (offset < count) {
    const results = await collection.get({ limit: batchSize, offset });
    if (results.ids.length > 0) {
      await collection.delete({ ids: results.ids });
      console.log(`Deleted ${results.ids.length} segments.`);
    }
    offset += batchSize;
  }
  console.log('✅ Collection cleared. You can now re-ingest with the new embedder.');
}

clearChromaCollection().catch(console.error);
