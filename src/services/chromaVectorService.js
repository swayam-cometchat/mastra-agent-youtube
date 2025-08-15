// chroma-service.js - ChromaDB vector search service
import { ChromaClient, CloudClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';

class ChromaVectorService {
  constructor() {
    // Use environment variables for Chroma Cloud or local development
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && process.env.CHROMA_CLOUD_API_KEY) {
      // Chroma Cloud configuration
      this.client = new CloudClient({
        apiKey: process.env.CHROMA_CLOUD_API_KEY,
        tenant: process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE
      });
      console.log('🌥️ Using Chroma Cloud');
    } else {
      // Local development configuration
      this.client = new ChromaClient({ 
        host: process.env.CHROMA_HOST || "localhost",
        port: parseInt(process.env.CHROMA_PORT) || 8000
      });
      console.log('🖥️ Using local ChromaDB');
    }
    
    this.collection = null;
    this.embedFunction = new DefaultEmbeddingFunction();
    this.isProduction = isProduction;
  }

  async initialize() {
    try {
      const collectionName = process.env.CHROMA_COLLECTION_NAME || "youtube_transcripts_complete";
      
      // For production, add more robust error handling
      if (this.isProduction) {
        // Try with longer timeout for cloud connection
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cloud connection timeout')), 15000)
        );
        
        const connectPromise = this.client.getCollection({ 
          name: collectionName,
          embeddingFunction: this.embedFunction
        });
        
        this.collection = await Promise.race([connectPromise, timeoutPromise]);
      } else {
        // For local development, handle missing collection gracefully
        try {
          this.collection = await this.client.getCollection({ 
            name: collectionName,
            embeddingFunction: this.embedFunction
          });
        } catch (localError) {
          console.log('⚠️ Local collection not found - this is normal if you haven\'t set up local data');
          throw new Error('Local ChromaDB collection not available');
        }
      }
      
      console.log('✅ ChromaDB connection established');
      return true;
    } catch (error) {
      console.log('❌ ChromaDB connection failed:', error.message);
      return false;
    }
  }

  async vectorSearch(query, limit = 3) {
    try {
      if (!this.collection) {
        const connected = await this.initialize();
        if (!connected) {
          throw new Error('ChromaDB not available');
        }
      }

      console.log(`🔍 ChromaDB vector search for: "${query}"`);
      
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit
      });
      
      console.log(`📊 ChromaDB found ${results.documents[0].length} results`);
      
      if (!results.documents[0] || results.documents[0].length === 0) {
        return [];
      }

      // Format results to match expected structure
      const formattedResults = results.documents[0].map((doc, i) => {
        const metadata = results.metadatas[0][i];
        const distance = results.distances[0][i];
        const similarity = Math.max(0, 1 - distance); // Convert distance to similarity score
        
        return {
          videoTitle: metadata.title || 'Unknown Video',
          transcript: doc,
          timestamp: `${metadata.start_time}s - ${metadata.end_time}s`,
          videoUrl: metadata.url || 'https://youtube.com/watch?v=unknown',
          relevanceScore: Math.min(similarity, 1.0),
          source: 'ChromaDB Vector Search'
        };
      });

      console.log(`✅ ChromaDB vector search successful: ${formattedResults.length} results`);
      return formattedResults;

    } catch (error) {
      console.log('❌ ChromaDB vector search failed:', error.message);
      throw error;
    }
  }

  async getCollectionInfo() {
    try {
      if (!this.collection) {
        await this.initialize();
      }
      
      const count = await this.collection.count();
      console.log(`📊 ChromaDB collection has ${count} documents`);
      return { count };
    } catch (error) {
      console.log('❌ Failed to get collection info:', error.message);
      return { count: 0 };
    }
  }
}

export default ChromaVectorService;
