// export-chroma-data.js - Export local ChromaDB data for cloud upload
import fs from 'fs';
import ChromaVectorService from './src/services/chromaVectorService.js';

async function exportChromaData() {
  console.log('📦 Exporting ChromaDB Data for Cloud Upload');
  console.log('===========================================\n');

  try {
    const chromaService = new ChromaVectorService();
    await chromaService.initialize();
    
    console.log('📊 Getting collection info...');
    const info = await chromaService.getCollectionInfo();
    console.log(`📚 Collection: ${info.count} documents\n`);

    console.log('📥 Fetching all data...');
    const collection = chromaService.collection;
    
    // Get all documents with metadata
    const results = await collection.get({
      include: ['metadatas', 'documents', 'embeddings']
    });

    const exportData = {
      collection_name: 'youtube_transcripts_complete',
      total_documents: results.documents.length,
      export_timestamp: new Date().toISOString(),
      data: results.documents.map((doc, i) => ({
        id: results.ids[i],
        document: doc,
        metadata: results.metadatas[i],
        embedding: results.embeddings ? results.embeddings[i] : null
      }))
    };

    // Save to file
    const filename = 'chroma-export.json';
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    console.log('✅ Export completed successfully!');
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Documents: ${exportData.total_documents}`);
    console.log(`💾 File size: ${(fs.statSync(filename).size / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n🚀 Next steps:');
    console.log('1. Upload this file to Chroma Cloud');
    console.log('2. Update environment variables');
    console.log('3. Deploy to production');

  } catch (error) {
    console.error('❌ Export failed:', error.message);
  }
}

exportChromaData();
