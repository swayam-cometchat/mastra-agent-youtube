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

const keyword = 'Carianne'; // Change this to any keyword you want to check

async function checkKeywordInChroma() {
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
  // Fetch all documents (may need to page if large)
  const count = await collection.count();
  console.log(`Collection contains ${count} segments.`);

  // Chroma Cloud JS SDK does not support full scan, so we query in batches
  let found = [];
  let offset = 0;
  const batchSize = 100;
  while (offset < count) {
    const results = await collection.get({
      limit: batchSize,
      offset,
      include: ['documents', 'metadatas'], // 'ids' is always included
    });
    for (let i = 0; i < results.documents.length; i++) {
      const doc = results.documents[i];
      if (doc && doc.includes(keyword)) {
        found.push({
          id: results.ids[i],
          text: doc,
          metadata: results.metadatas[i],
        });
      }
    }
    offset += batchSize;
  }

  if (found.length === 0) {
    console.log(`❌ No segment found containing "${keyword}" in Chroma Cloud.`);
  } else {
    console.log(`✅ Found ${found.length} segment(s) containing "${keyword}":`);
    found.slice(0, 5).forEach((seg, idx) => {
      console.log(`#${idx + 1} [${seg.metadata?.start}s - ${seg.metadata?.end || ''}s]: ${seg.text}`);
    });
    if (found.length > 5) {
      console.log(`...and ${found.length - 5} more.`);
    }
  }
}

checkKeywordInChroma().catch(console.error);
