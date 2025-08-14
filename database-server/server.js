const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3002;

// Enable gzip compression
app.use(compression());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Serve static files from data directory
app.use('/data', express.static(path.join(__dirname, 'data')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Database endpoint
app.get('/database', (req, res) => {
  const dbPath = path.join(__dirname, 'data', 'transcript_vectors.db.gz');
  console.log('Database download requested, path:', dbPath);
  console.log('File exists:', require('fs').existsSync(dbPath));
  res.download(dbPath, 'transcript_vectors.db.gz', (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(404).json({ error: 'Database file not found' });
    } else {
      console.log('Download completed successfully');
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'YouTube Transcript Database Server',
    endpoints: {
      health: '/health',
      database: '/database',
      direct: '/data/transcript_vectors.db.gz'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Database server running on port ${PORT}`);
  console.log(`Database available at: http://localhost:${PORT}/database`);
  console.log(`Direct access at: http://localhost:${PORT}/data/transcript_vectors.db.gz`);
});
