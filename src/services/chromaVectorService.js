import { ChromaClient, CloudClient } from "chromadb";

class ChromaVectorService {
  constructor() {
    this.client = null;
    this.collection = null;
  }

  async initialize() {
    if (process.env.CHROMA_CLOUD_API_KEY) {
      // Use Chroma Cloud
      this.client = new CloudClient({
        apiKey: process.env.CHROMA_CLOUD_API_KEY,
        tenant: process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE,
      });
      console.log("✅ Using Chroma Cloud");
    } else {
      // Local Chroma
      this.client = new ChromaClient({ path: "http://localhost:8000" });
      console.log("✅ Using Local Chroma");
    }

    // Create or connect to collection
    this.collection = await this.client.getOrCreateCollection({
      name: process.env.CHROMA_COLLECTION_NAME || "youtube_transcripts",
    });

    // 🔎 Debug logs
    const count = await this.collection.count();
    console.log(`📦 Connected to collection "${this.collection.name}"`);
    console.log(`📊 Document count in collection: ${count}`);

    // 🚨 Fail loudly if collection is empty
    if (count === 0) {
      throw new Error(
        `❌ Chroma collection "${this.collection.name}" is empty! 
        Check that you ingested data into the correct tenant/database/collection.`
      );
    }
  }

  async search(query) {
    if (!this.collection) {
      throw new Error("❌ Chroma not initialized");
    }
    return this.collection.query({
      queryTexts: [query],
      nResults: 5,
    });
  }
}

export default ChromaVectorService;
