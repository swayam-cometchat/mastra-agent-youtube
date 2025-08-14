# YouTube Transcript Database Server

A simple Express.js server that hosts the compressed SQLite database containing YouTube transcript vectors.

## Endpoints

- `/health` - Health check endpoint
- `/database` - Download the compressed database file
- `/data/transcript_vectors.db.gz` - Direct access to the compressed database
- `/` - API documentation

## Database Info

- Original size: 97MB
- Compressed size: 39MB
- Contains: 3,375 transcript segments from Computer Science Crash Course playlist
- Format: SQLite with vector embeddings

## Usage

The database file can be downloaded and decompressed programmatically:

```javascript
// Download and decompress
const response = await fetch('https://your-server.railway.app/database');
const buffer = await response.arrayBuffer();
const decompressed = zlib.gunzipSync(Buffer.from(buffer));
```

## Deployment

Configured for Railway.app deployment with automatic health checks.
