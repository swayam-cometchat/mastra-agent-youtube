#!/bin/bash

echo "🚀 Deploying YouTube Transcript Agent to Mastra"
echo "=============================================="

# Check if required environment variables are set
if [ -z "$YOUTUBE_API_KEY" ] || [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Missing required API keys"
    echo "Please set YOUTUBE_API_KEY and OPENAI_API_KEY"
    echo "Export them in your shell:"
    echo "export YOUTUBE_API_KEY='your_key_here'"
    echo "export OPENAI_API_KEY='your_key_here'"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check Mastra CLI
echo "🔧 Checking Mastra CLI..."
if ! command -v mastra &> /dev/null; then
    echo "Installing Mastra CLI..."
    npm install -g @mastra/cli
fi

# Create database backup
echo "💾 Creating database backup..."
if [ -f "./data/transcript_vectors.db" ]; then
    cp ./data/transcript_vectors.db "./data/transcript_vectors_backup_$(date +%Y%m%d_%H%M%S).db"
    echo "✅ Database backup created"
fi

# Validate configuration
echo "🔍 Validating Mastra configuration..."
if [ ! -f "mastra.config.json" ]; then
    echo "❌ mastra.config.json not found"
    exit 1
fi

# Test local API before deployment
echo "🧪 Testing local API..."
node src/mastra-agent.js &
SERVER_PID=$!
sleep 3

# Health check
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo "✅ Local API health check passed"
else
    echo "❌ Local API health check failed"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Stop test server
kill $SERVER_PID 2>/dev/null
sleep 1

# Deploy to Mastra
echo "🚀 Deploying to Mastra..."
mastra deploy

# Check deployment status
echo "📊 Checking deployment status..."
mastra status

echo ""
echo "🎉 Deployment Complete!"
echo "======================================"
echo "📡 API Endpoints:"
echo "   Health: GET /health"
echo "   Search: POST /search"
echo "   Process: POST /process-playlist"
echo "   Stats: GET /stats"
echo ""
echo "📚 API Documentation: ./API_DOCUMENTATION.md"
echo "🔗 Mastra Dashboard: https://dashboard.mastra.ai"
echo ""
echo "✅ YouTube Transcript Agent is now live!"
