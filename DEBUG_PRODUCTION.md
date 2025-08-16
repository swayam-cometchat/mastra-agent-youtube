## 🔍 Debug Your Live Deployment

Your agent is falling back to mock data instead of using Chroma Cloud. Here's how to debug:

### **Step 1: Check Environment Variables in Mastra Dashboard**

Go to your Mastra deployment dashboard and verify these variables are set:

```env
NODE_ENV=production
CHROMA_CLOUD_API_KEY=ck-EDR6F7F7BcRdhs63czLBEmpuQhBLEPPp6e9jpAyummTX
CHROMA_TENANT=09c64246-f85d-4272-8ce1-34470d2eacf5
CHROMA_DATABASE=youtube-transcripts
CHROMA_COLLECTION_NAME=youtube_transcripts_complete
```

### **Step 2: Check Build/Deploy Logs**

Look for these messages in your deployment logs:
- ✅ `"🌥️ Using Chroma Cloud"` (good)
- ❌ `"🖥️ Using local ChromaDB"` (wrong for production)
- ❌ `"⚠️ ChromaDB unavailable, falling back to SQLite search"` (connection issue)

### **Step 3: Test Environment Variables**

Add this debug log to your tool temporarily:

```typescript
console.log('🐛 DEBUG - Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CHROMA_CLOUD_API_KEY:', process.env.CHROMA_CLOUD_API_KEY ? 'SET' : 'MISSING');
console.log('CHROMA_TENANT:', process.env.CHROMA_TENANT ? 'SET' : 'MISSING');
console.log('CHROMA_DATABASE:', process.env.CHROMA_DATABASE ? 'SET' : 'MISSING');
```

### **Step 4: Common Issues**

1. **Missing Environment Variables**: Mastra deployment might not have loaded your .env.production
2. **CloudClient Import Issue**: The chromadb package might have import issues in serverless environment
3. **Network/Timeout**: Chroma Cloud connection might be timing out

### **Quick Fix: Redeploy with Debug**

1. Add debug logs to see what's failing
2. Redeploy: `npm run deploy`
3. Check logs to see exact error

### **Alternative: Manual Environment Check**

In your Mastra dashboard:
1. Go to Environment Variables section
2. Manually add each variable:
   - `CHROMA_CLOUD_API_KEY`
   - `CHROMA_TENANT` 
   - `CHROMA_DATABASE`
   - `CHROMA_COLLECTION_NAME`
   - `NODE_ENV=production`

**Which step do you want to try first?** The most likely issue is environment variables not being loaded properly in the Mastra deployment.
