import { CloudClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

class ChromaVectorService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.initialized = false;
  }

  async initialize() {
    // ✅ If already initialized, just return the cached collection
    if (this.initialized && this.collection) {
      return this.collection;
    }

    // Use Chroma Cloud (load credentials from environment variables)
    const apiKey = process.env.CHROMA_CLOUD_API_KEY;
    const tenant = process.env.CHROMA_TENANT;
    const database = process.env.CHROMA_DATABASE;
    if (!apiKey || !tenant || !database) {
      throw new Error('❌ Missing Chroma Cloud credentials in environment variables');
    }
    this.client = new CloudClient({
      apiKey,
      tenant,
      database,
    });
    console.log("✅ Using Chroma Cloud");

    // OpenAI embedding function (384d for text-embedding-3-small)
    const embedder = new OpenAIEmbeddingFunction({
      openai_api_key: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
      dimensions: 384,
    });

    // Create or connect to collection
    this.collection = await this.client.getOrCreateCollection({
      name: "youtube_transcripts_complete",
      embeddingFunction: embedder,
      metadata: { "hnsw:space": "cosine" },
    });

    // Debug logs (do this only once!)
    const count = await this.collection.count();
    console.log(`📦 Connected to collection "${this.collection.name}"`);
    console.log(`📊 Document count in collection: ${count}`);

    this.initialized = true;
    return this.collection;
  }

  async vectorSearch(query, limit = 3) {
    const collection = await this.initialize();

    const response = await collection.query({
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
      const videoTitle = meta.videoTitle || meta.title || meta.name || "Unknown Video";
      const videoUrl = meta.videoUrl || meta.url || meta.link || "";
      const timestamp = meta.timestamp || meta.time || meta.start || "";
      return {
        videoTitle,
        transcript: doc || "",
        timestamp,
        videoUrl,
        id: ids && ids[i] ? ids[i] : undefined,
      };
    });
  }
}

export default ChromaVectorService;
