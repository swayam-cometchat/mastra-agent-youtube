#!/bin/bash

echo "🚀 Building and Preparing YouTube Transcript Agent for Deployment"
echo "==============================================================="

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

# Build with database inclusion
echo "🚀 Building Mastra project..."
mastra build

echo "📁 Copying database file to build output..."
mkdir -p .mastra/output/data
cp data/transcript_vectors.db .mastra/output/data/

echo "✅ Build completed with database included!"
echo "� Output directory: .mastra/output/"
echo "💾 Database size: $(ls -lh .mastra/output/data/transcript_vectors.db | awk '{print $5}')"

echo ""
echo "🎉 Build Complete!"
echo "======================================"
echo "🌐 Ready for deployment!"
echo "The .mastra/output directory contains all files needed for deployment."
echo ""
echo "Next steps:"
echo "1. Deploy the contents of .mastra/output/ to your platform"
echo "2. Ensure the data/ directory is included in the deployment"
echo "3. Test the agent with queries like 'interoperability' or 'algorithms'"
echo ""
echo "✅ YouTube Transcript Agent build ready!"
