// === IMPORTANT: Production Upload Checklist ===
// 1. Ensure you have pushed the latest code with:
//    import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
//    and you pass the embedder to getOrCreateCollection.
// 2. On your production server:
//    a) Run: npm install @chroma-core/openai
//    b) Ensure your .env.production (or .env) has all Chroma/OpenAI keys set.
// 3. (Recommended) Clear the Chroma collection before uploading new data, to avoid mixed/invalid vectors.
//    Use: node scripts/clear-chroma-collection.js
// 4. Run this upload script in production:
//    node upload-to-chroma-cloud.js
// 5. If you see errors about embedding function, check your code, dependencies, and .env again.

// upload-to-chroma-cloud.js - Upload local data to Chroma Cloud
import fs from 'fs';
import { CloudClient } from 'chromadb';
import dotenv from 'dotenv';
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";


// Load environment variables
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

async function uploadToChromaCloud() {
  console.log('☁️ Uploading Data to Chroma Cloud');
  console.log('==================================\n');

  try {
    // Read the export file
    console.log('📁 Reading export file...');
    const exportData = JSON.parse(fs.readFileSync('chroma-export.json', 'utf8'));
    console.log(`📊 Found ${exportData.total_documents} documents to upload\n`);

    // Create Chroma Cloud client
    console.log('🌥️ Connecting to Chroma Cloud...');
    
    const apiKey = process.env.CHROMA_CLOUD_API_KEY;
    const tenant = process.env.CHROMA_TENANT;
    const database = process.env.CHROMA_DATABASE;
    
    console.log(`🔑 API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`🏢 Tenant: ${tenant}`);
    console.log(`🗄️ Database: ${database}\n`);
    
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      console.log('❌ API key not found or not set properly');
      console.log('💡 Make sure .env.production has CHROMA_CLOUD_API_KEY set');
      return;
    }

    const client = new CloudClient({
      apiKey: apiKey,
      tenant: tenant,
      database: database
    });


    const embedder = new OpenAIEmbeddingFunction({
      openai_api_key: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
      dimensions: 384,
    });

    // Create or get collection
    console.log('📚 Creating collection...');
    this.collection = await this.client.getOrCreateCollection({
      name: "youtube_transcripts_complete",
      embeddingFunction: embedder,
      metadata: { "hnsw:space": "cosine" },
    });

    console.log('✅ Collection ready, starting upload...\n');

    // Upload in batches of 100
    const batchSize = 100;
    const totalBatches = Math.ceil(exportData.data.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, exportData.data.length);
      const batch = exportData.data.slice(start, end);

      console.log(`⬆️ Uploading batch ${i + 1}/${totalBatches} (${start + 1}-${end})...`);

      const ids = batch.map(item => item.id);
      const documents = batch.map(item => item.document);
      const metadatas = batch.map(item => item.metadata);

      await collection.add({
        ids: ids,
        documents: documents,
        metadatas: metadatas
      });

      console.log(`✅ Batch ${i + 1} uploaded successfully`);
      
      // Small delay to avoid rate limiting
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n🎉 Upload completed successfully!');
    console.log(`📊 Total documents uploaded: ${exportData.total_documents}`);
    console.log('🚀 Your Chroma Cloud database is ready for production!');

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check your API key in .env.production');
    console.log('2. Verify your Chroma Cloud connection');
    console.log('3. Make sure the database exists in Chroma Cloud dashboard');
  }
}

uploadToChromaCloud();
