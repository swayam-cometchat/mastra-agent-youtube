import { CloudClient } from 'chromadb';
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

export async function keywordSearchInChroma(query, limit = 3) {
  const CHROMA_CLOUD_API_KEY = process.env.CHROMA_CLOUD_API_KEY;
  const CHROMA_TENANT = process.env.CHROMA_TENANT;
  const CHROMA_DATABASE = process.env.CHROMA_DATABASE;
  const CHROMA_COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || 'youtube_transcripts_complete';
  const searchTerm = (typeof query === 'string' ? query.trim().toLowerCase() : '');
  console.log(`[keywordSearchInChroma] Searching for: '${searchTerm}' (limit: ${limit})`);

  if (!CHROMA_CLOUD_API_KEY || !CHROMA_TENANT || !CHROMA_DATABASE) {
    throw new Error('❌ Missing Chroma Cloud credentials in .env');
  }

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

  let found = [];
  let offset = 0;
  const batchSize = 100;
  while (offset < count && found.length < limit) {
    const results = await collection.get({
      limit: batchSize,
      offset,
      include: ['documents', 'metadatas'],
    });
    for (let i = 0; i < results.documents.length; i++) {
      const doc = results.documents[i];
      if (doc && doc.toLowerCase().includes(searchTerm)) {
        found.push({
          videoTitle: results.metadatas[i]?.videoTitle || 'Unknown Video',
          transcript: doc,
          timestamp: results.metadatas[i]?.timestamp || results.metadatas[i]?.start || '',
          start: results.metadatas[i]?.start,
          end: results.metadatas[i]?.end,
          videoUrl: results.metadatas[i]?.videoUrl || '',
          relevanceScore: 1.0,
        });
        console.log(`[keywordSearchInChroma] Match: '${doc}' (video: ${results.metadatas[i]?.videoTitle}, start: ${results.metadatas[i]?.start})`);
        if (found.length >= limit) break;
      }
    }
    offset += batchSize;
  }
  console.log(`[keywordSearchInChroma] Total matches found: ${found.length}`);
  return found;
}
