// simple-chroma-upload.js - Upload to Chroma Cloud using REST API
import fs from 'fs';
import fetch from 'node-fetch';

async function uploadToChromaCloudRest() {
  console.log('☁️ Uploading to Chroma Cloud (REST API)');
  console.log('=====================================\n');

  const apiKey = 'ck-EDR6F7F7BcRdhs63czLBEmpuQhBLEPPp6e9jpAyummTX';
  const tenant = '09c64246-f85d-4272-8ce1-34470d2eacf5';
  const database = 'youtube-transcripts';
  const baseUrl = `https://api.trychroma.com`;

  try {
    // Read export data
    console.log('📁 Reading export file...');
    const exportData = JSON.parse(fs.readFileSync('chroma-export.json', 'utf8'));
    console.log(`📊 Found ${exportData.total_documents} documents\n`);

    // Test connection by listing collections
    console.log('🔍 Testing connection...');
    const listUrl = `${baseUrl}/api/v1/collections`;
    
    const response = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Chroma-Token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const collections = await response.json();
    console.log('✅ Connection successful!');
    console.log(`📚 Found ${collections.length} collections\n`);

    // Create collection if it doesn't exist
    console.log('📚 Creating collection...');
    const createUrl = `${baseUrl}/api/v1/collections`;
    
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Chroma-Token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'youtube_transcripts_complete',
        metadata: {
          'hnsw:space': 'cosine'
        }
      })
    });

    if (createResponse.ok) {
      console.log('✅ Collection created successfully');
    } else if (createResponse.status === 409) {
      console.log('✅ Collection already exists');
    } else {
      const error = await createResponse.text();
      console.log(`⚠️ Collection creation response: ${createResponse.status} - ${error}`);
    }

    console.log('\n🎉 Ready for manual upload!');
    console.log('💡 You can now upload your data through the Chroma Cloud dashboard');
    console.log(`📁 Use file: chroma-export.json (${(fs.statSync('chroma-export.json').size / 1024 / 1024).toFixed(2)} MB)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: Manual Upload');
    console.log('1. Go to your Chroma Cloud dashboard');
    console.log('2. Create collection: youtube_transcripts_complete');
    console.log('3. Upload the chroma-export.json file manually');
  }
}

uploadToChromaCloudRest();
