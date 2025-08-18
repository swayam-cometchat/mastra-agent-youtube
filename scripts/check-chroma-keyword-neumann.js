import dotenv from 'dotenv';
dotenv.config();
import { keywordSearchInChroma } from '../src/services/chromaKeywordSearch.js';

const keyword = 'neumann';
const limit = 100;

async function run() {
  const results = await keywordSearchInChroma(keyword, limit);
  if (!results.length) {
    console.log(`❌ No segments found containing "${keyword}" in Chroma Cloud.`);
  } else {
    console.log(`✅ Found ${results.length} segment(s) containing "${keyword}":`);
    results.forEach((seg, idx) => {
      console.log(`#${idx + 1} [${seg.timestamp}]: ${seg.transcript}`);
    });
  }
}

run().catch(console.error);
