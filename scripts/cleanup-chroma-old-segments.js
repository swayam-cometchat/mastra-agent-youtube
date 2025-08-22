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

async function cleanupOldSegments() {
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
  let offset = 0;
  const batchSize = 100;
  let toDelete = [];
  while (offset < count) {
    const results = await collection.get({
      limit: batchSize,
      offset,
      include: ['metadatas'], // 'ids' is always included
    });
    for (let i = 0; i < results.metadatas.length; i++) {
      const meta = results.metadatas[i];
      if (!meta || meta.start === undefined || meta.end === undefined) {
        toDelete.push(results.ids[i]);
      }
    }
    offset += batchSize;
  }
  if (toDelete.length === 0) {
    console.log('✅ No old segments found. All segments have start and end times.');
    return;
  }
  console.log(`Found ${toDelete.length} old segments without start/end. Deleting...`);
  // Chroma Cloud API may have a limit on batch delete size
  const deleteBatchSize = 100;
  for (let i = 0; i < toDelete.length; i += deleteBatchSize) {
    const batch = toDelete.slice(i, i + deleteBatchSize);
    await collection.delete({ ids: batch });
    console.log(`Deleted ${batch.length} segments.`);
  }
  console.log('✅ Cleanup complete.');
}

cleanupOldSegments().catch(console.error);
