import { CloudClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

class ChromaVectorService {
  constructor() {
    this.client = null;
    this.collection = null;
  }

  async initialize() {
  if ('ck-EDR6F7F7BcRdhs63czLBEmpuQhBLEPPp6e9jpAyummTX') {
    // Use Chroma Cloud
    this.client = new CloudClient({
      apiKey: "ck-7pxyVfWWNmfc9RrnhoUkWAXfV5XfWWQRzy2zSFm4gGkF",
      tenant: "09c64246-f85d-4272-8ce1-34470d2eacf5",
      database: "youtube-transcripts",
    });
    console.log("✅ Using Chroma Cloud");
  } else {
    // Local Chroma
    this.client = new ChromaClient({ path: "http://localhost:8000" });
    console.log("✅ Using Local Chroma");
  }

  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
    dimensions: 384, // 384 dimension
  });

  // ✅ Explicitly set dimension to 1536
  this.collection = await this.client.getOrCreateCollection({
    name: "youtube_transcripts_complete",
    embeddingFunction: embedder,
    metadata: { "hnsw:space": "cosine" }, // optional: similarity metric
  });

  // Debug logs
  const count = await this.collection.count();
  console.log(`📦 Connected to collection "${this.collection.name}"`);
  console.log(`📊 Document count in collection: ${count}`);

  if (count === 0) {
    throw new Error(
      `❌ Chroma collection "${this.collection.name}" is empty! 
      Ensure you ingested data into the correct tenant/database/collection with dimension 1536.`
    );
  }
}


  async vectorSearch(query, limit = 3) {
    await this.initialize();
    const response = await this.collection.query({
      queryTexts: [query],
      nResults: limit,
    });
    if (!response || !response.documents || response.documents.length === 0) {
      return [];
    }
    const docs = response.documents[0] || [];
    const metadatas = response.metadatas ? response.metadatas[0] : [];
    const ids = response.ids ? response.ids[0] : [];
    return docs.map((doc, i) => {
      const meta = metadatas && metadatas[i] ? metadatas[i] : {};
      const videoTitle = meta.videoTitle || meta.title || meta.name || 'Unknown Video';
      const videoUrl = meta.videoUrl || meta.url || meta.link || '';
      const timestamp = meta.timestamp || meta.time || meta.start || '';
      return {
        videoTitle,
        transcript: doc || '',
        timestamp,
        videoUrl,
        id: ids && ids[i] ? ids[i] : undefined
      };
    });
  }
}

export default ChromaVectorService;
