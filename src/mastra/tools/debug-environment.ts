import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const debugEnvironmentTool = createTool({
  id: 'debugEnvironment',
  description: 'Debug tool to check environment variables in production',
  inputSchema: z.object({
    check: z.string().default('all').describe('What to check')
  }),
  outputSchema: z.object({
    environment: z.string(),
    variables: z.record(z.any()),
    chromaStatus: z.string(),
    recommendations: z.array(z.string())
  }),
  execute: async () => {
    const env = process.env.NODE_ENV || 'unknown';
    const chromaVars = {
      'CHROMA_CLOUD_API_KEY': process.env.CHROMA_CLOUD_API_KEY ? `SET (${process.env.CHROMA_CLOUD_API_KEY.length} chars)` : 'MISSING',
      'CHROMA_TENANT': process.env.CHROMA_TENANT ? 'SET' : 'MISSING',
      'CHROMA_DATABASE': process.env.CHROMA_DATABASE ? 'SET' : 'MISSING',
      'CHROMA_COLLECTION_NAME': process.env.CHROMA_COLLECTION_NAME ? 'SET' : 'MISSING'
    };
    
    const hasChromaCloud = process.env.CHROMA_CLOUD_API_KEY && process.env.CHROMA_TENANT && process.env.CHROMA_DATABASE;
    
    let chromaStatus = 'UNKNOWN';
    let recommendations = [];
    
    if (!hasChromaCloud) {
      chromaStatus = 'MISSING_CREDENTIALS';
      recommendations.push('Set missing ChromaDB Cloud environment variables in production dashboard');
    } else {
      try {
        // Test actual connection
        const ChromaVectorService = await import('../../services/chromaVectorService.js') as any;
        const chromaService = new ChromaVectorService.default();
        const connected = await chromaService.initialize();
        
        if (connected) {
          chromaStatus = 'CONNECTED';
          recommendations.push('ChromaDB is working correctly');
        } else {
          chromaStatus = 'CONNECTION_FAILED';
          recommendations.push('ChromaDB credentials are set but connection failed - check network/firewall');
        }
      } catch (error: any) {
        chromaStatus = 'ERROR: ' + (error?.message || 'Unknown error');
        recommendations.push('ChromaDB connection error: ' + (error?.message || 'Unknown error'));
      }
    }
    
    return {
      environment: env,
      variables: chromaVars,
      chromaStatus,
      recommendations
    };
  }
});
