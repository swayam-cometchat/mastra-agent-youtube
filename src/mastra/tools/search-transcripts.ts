import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const searchTranscriptsTool = createTool({
  id: 'searchTranscripts',
  description: 'Search through YouTube transcript database to find relevant videos and content based on user queries',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant transcript content'),
    limit: z.number().optional().default(3).describe('Maximum number of results to return')
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      videoTitle: z.string(),
      transcript: z.string(),
      timestamp: z.string(),
      videoUrl: z.string(),
      relevanceScore: z.number()
    })),
    totalResults: z.number(),
    query: z.string()
  }),
  execute: async (params) => {
    // Extract query and limit from parameters
    let query, limit = 3;
    
    // Based on Mastra's parameter structure, the actual parameters are in params.context
    if (params && params.context) {
      query = params.context.query;
      limit = params.context.limit || 3;
    } else if (params && typeof params === 'object') {
      if (params.query) {
        query = params.query;
        limit = params.limit || 3;
      } else if (params.input && params.input.query) {
        query = params.input.query;
        limit = params.input.limit || 3;
      } else if (params.args && params.args.query) {
        query = params.args.query;
        limit = params.args.limit || 3;
      }
    } else if (typeof params === 'string') {
      query = params;
    }
    
    // Validate query
    if (!query || query === 'undefined' || typeof query !== 'string') {
      return {
        query: 'invalid',
        results: [{
          videoTitle: "Search Error",
          transcript: "Invalid search query received. Please try again with a valid search term.",
          timestamp: "00:00",
          videoUrl: "https://youtube.com/watch?v=error",
          relevanceScore: 0
        }],
        totalResults: 1
      };
    }
    
    try {
      // Try to use real database first with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database search timeout after 10 seconds')), 10000);
      });
      
      // Try remote database first if URL is provided
      if (process.env.DATABASE_FILE_URL) {
        console.log('🌐 Attempting remote database download...');
        const searchPromise = searchRemoteDatabase(query, limit);
        const realResults = await Promise.race([searchPromise, timeoutPromise]);
        
        if (realResults && realResults.length > 0) {
          return {
            query,
            results: realResults,
            totalResults: realResults.length
          };
        }
      }
      
      // Fallback to local database
      const searchPromise = searchRealDatabase(query, limit);
      const realResults = await Promise.race([searchPromise, timeoutPromise]);
      
      if (realResults && realResults.length > 0) {
        return {
          query,
          results: realResults,
          totalResults: realResults.length
        };
      }
    } catch (error) {
      console.log('🔄 Real database search failed, using fallback data');
      console.log('🔍 Error details:', error.message);
      console.log('🌍 Environment:', process.env.NODE_ENV || 'unknown');
      console.log('📁 Current working directory:', process.cwd());
      console.log('🚀 Deployment mode:', process.env.MASTRA_DEPLOYMENT || 'false');
    }
    
    // Fallback to realistic mock data with deployment notification
    try {
      console.log('🔄 Using fallback data - database not available in deployment');
      const searchResults = generateDeploymentFallbackResults(query, limit);
      
      return {
        query,
        results: searchResults,
        totalResults: searchResults.length
      };
    } catch (error) {
      console.error('Search tool error:', error);
      
      // Return empty results on error
      return {
        query: query || 'error',
        results: [{
          videoTitle: "Search Error",
          transcript: `Error occurred while searching for "${query}": ${error.message}`,
          timestamp: "00:00",
          videoUrl: "https://youtube.com/watch?v=error",
          relevanceScore: 0
        }],
        totalResults: 1
      };
    }
  }
});

// Function to search the real vector database

// Function to download and search database from URL
async function searchDownloadedDatabase(query: string, limit: number) {
  try {
    console.log(`📥 Downloading database from: ${process.env.DATABASE_FILE_URL}`);
    
    const fs = await import('fs');
    const path = await import('path');
    
    // Create temp directory
    const tempDir = '/tmp/mastra-db';
    const dbPath = path.join(tempDir, 'transcript_vectors.db');
    
    // Check if database already exists locally
    if (!fs.existsSync(dbPath)) {
      console.log('🔄 Database not cached, downloading...');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const response = await fetch(process.env.DATABASE_FILE_URL!);
      if (!response.ok) {
        throw new Error(`Failed to download database: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(dbPath, Buffer.from(buffer));
      console.log('✅ Database downloaded successfully');
    } else {
      console.log('📋 Using cached database');
    }
    
    // Now use the downloaded database
    const VectorDatabaseModule = await import('../../services/vectorDatabase.js');
    const VectorDatabase = VectorDatabaseModule.default;
    const db = new VectorDatabase(dbPath);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Search the database
    const searchResults = await db.searchTranscripts(query, limit);
    
    if (!searchResults || searchResults.length === 0) {
      throw new Error('No results found');
    }
    
    // Format results
    const formattedResults = searchResults.map((result: any) => {
      const firstSegment = result.matchingSegments?.[0];
      return {
        videoTitle: result.video?.title || 'Unknown Video',
        transcript: firstSegment?.text || result.video?.title || '',
        timestamp: formatTime(firstSegment?.timestamp || 0),
        videoUrl: result.video?.url || 'https://youtube.com/watch?v=unknown',
        relevanceScore: Math.min(result.relevanceScore || 0.5, 1.0)
      };
    });
    
    // Close database
    if (db.close) {
      await db.close();
    }
    
    return formattedResults.slice(0, limit);
    
  } catch (error) {
    console.log('❌ Downloaded database search failed:', error.message);
    throw error;
  }
}

// Function to search the real vector database
async function searchRealDatabase(query: string, limit: number) {
  try {
    console.log(`🔍 Attempting real database search for: "${query}"`);
    console.log('🌍 Environment debug info:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV || 'undefined');
    console.log('  - MASTRA_DEPLOYMENT:', process.env.MASTRA_DEPLOYMENT || 'undefined');
    console.log('  - Current working directory:', process.cwd());
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Check if we have a remote database URL
    if (process.env.DATABASE_URL) {
      console.log('🌐 Using remote database URL');
      return await searchRemoteDatabase(query, limit);
    }
    
    // Check if we have a database file URL to download
    if (process.env.DATABASE_FILE_URL) {
      console.log('📥 Downloading database from URL');
      return await searchDownloadedDatabase(query, limit);
    }
    
    console.log('📁 Using local database file');
    
    // Dynamic import of the ES module
    const VectorDatabaseModule = await import('../../services/vectorDatabase.js');
    const VectorDatabase = VectorDatabaseModule.default;
    
    console.log('📁 Database module loaded successfully');
    
    // Get absolute path to database - try multiple locations
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const fs = await import('fs');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Try different possible paths for database
    const possiblePaths = [
      path.resolve(__dirname, '../../../data/test_small.db'), // TEST: small database
      path.resolve(__dirname, '../../../data/transcript_vectors.db'), // development  
      path.resolve(process.cwd(), 'data/test_small.db'), // TEST: deployment small
      path.resolve(process.cwd(), 'data/transcript_vectors.db'), // deployment root
      path.resolve(__dirname, './data/test_small.db'), // TEST: relative small
      path.resolve(__dirname, './data/transcript_vectors.db'), // relative to build
      './data/test_small.db', // TEST: fallback small
      './data/transcript_vectors.db' // fallback relative path
    ];
    
    let dbPath = '';
    for (const testPath of possiblePaths) {
      console.log(`🔍 Checking database path: ${testPath}`);
      if (fs.existsSync(testPath)) {
        dbPath = testPath;
        console.log(`✅ Found database at: ${dbPath}`);
        break;
      }
    }
    
    if (!dbPath) {
      console.log('⚠️ Database file not found at any of the expected locations:', possiblePaths);
      throw new Error('Database file not found - using fallback data');
    }
    
    console.log(`📂 Using database path: ${dbPath}`);
    
    // Create database instance with explicit path
    const db = new VectorDatabase(dbPath);
    
    console.log('🔧 Database instance created');
    
    // Wait for database initialization - reduced wait time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('⏳ Database initialization wait completed');
    
    // Test database connection first
    const testQuery = new Promise((resolve, reject) => {
      if (!db.db) {
        reject(new Error('Database connection not initialized'));
        return;
      }
      
      db.db.get("SELECT COUNT(*) as count FROM transcript_segments", (err: any, row: any) => {
        if (err) {
          console.log('❌ Database connection test failed:', err.message);
          reject(err);
        } else {
          console.log(`📊 Database has ${row?.count || 0} transcript segments`);
          if (row?.count === 0) {
            reject(new Error('Database is empty - no transcript segments found'));
          }
          resolve(row);
        }
      });
    });
    
    await testQuery;
    
    // Search the database
    console.log(`🔍 Starting database search for: "${query}"`);
    const searchResults = await db.searchTranscripts(query, limit);
    
    console.log(`📊 Raw search results:`, searchResults);
    console.log(`📊 Search results length: ${searchResults?.length || 0}`);
    
    if (!searchResults || searchResults.length === 0) {
      console.log('ℹ️ No results found in database for query:', query);
      throw new Error('No results found');
    }
    
    // Format results to match our expected structure
    const formattedResults = searchResults.map((result: any, index: number) => {
      console.log(`🔧 Formatting result ${index + 1}:`, result);
      const firstSegment = result.matchingSegments?.[0];
      const formatted = {
        videoTitle: result.video?.title || 'Unknown Video',
        transcript: firstSegment?.text || result.video?.title || '',
        timestamp: formatTime(firstSegment?.timestamp || 0),
        videoUrl: result.video?.url || 'https://youtube.com/watch?v=unknown',
        relevanceScore: Math.min(result.relevanceScore || 0.5, 1.0)
      };
      console.log(`✅ Formatted result ${index + 1}:`, formatted);
      return formatted;
    });
    
    console.log(`✅ Successfully formatted ${formattedResults.length} real database results`);
    
    // Close database connection
    if (db.close) {
      await db.close();
    }
    
    return formattedResults.slice(0, limit);
    
  } catch (error) {
    console.log('❌ Real database search error:', error.message);
    throw error;
  }
}

// Helper function to format timestamp
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function generateDeploymentFallbackResults(query: string, limit: number) {
  // Computer Science Crash Course themed fallback data
  const fallbackResults = [
    {
      videoTitle: "Intro to Algorithms: Crash Course Computer Science #13",
      transcript: `[FALLBACK DATA] An algorithm is just a series of steps that solve a problem. In computer science, we use algorithms to sort data, search through information, and solve complex computational problems. Some algorithms are better than others - we measure this through time and space complexity.`,
      timestamp: "2:15",
      videoUrl: "https://www.youtube.com/watch?v=rL8X2mlNHPM",
      relevanceScore: 0.85
    },
    {
      videoTitle: "Data Structures: Crash Course Computer Science #14", 
      transcript: `[FALLBACK DATA] Data structures are ways of organizing and storing data in a computer so it can be used efficiently. Arrays, linked lists, stacks, queues, trees, and graphs are fundamental data structures every programmer should understand.`,
      timestamp: "1:30",
      videoUrl: "https://www.youtube.com/watch?v=DuDz6B4cqVc",
      relevanceScore: 0.82
    },
    {
      videoTitle: "Programming Basics: Statements & Functions: Crash Course Computer Science #12",
      transcript: `[FALLBACK DATA] Programming is about writing instructions for computers to follow. We use variables to store data, functions to organize code, and control structures like loops and conditionals to make decisions.`,
      timestamp: "3:45", 
      videoUrl: "https://www.youtube.com/watch?v=l26oaHV7D40",
      relevanceScore: 0.78
    },
    {
      videoTitle: "How Computers Calculate - the ALU: Crash Course Computer Science #5",
      transcript: `[FALLBACK DATA] The Arithmetic Logic Unit (ALU) is the mathematical brain of a computer. It performs arithmetic operations like addition and subtraction, as well as logical operations like AND, OR, and NOT.`,
      timestamp: "4:20",
      videoUrl: "https://www.youtube.com/watch?v=1I5ZMmrOfnA", 
      relevanceScore: 0.75
    },
    {
      videoTitle: "Boolean Logic & Logic Gates: Crash Course Computer Science #3",
      transcript: `[FALLBACK DATA] Boolean logic is the foundation of all computer operations. Using just true and false values, we can represent any logical statement and build complex computational systems using logic gates.`,
      timestamp: "2:50",
      videoUrl: "https://www.youtube.com/watch?v=gI-qXk7XojA",
      relevanceScore: 0.72
    }
  ];

  // Filter results based on query relevance and return requested limit
  const filteredResults = fallbackResults
    .filter(result => 
      result.transcript.toLowerCase().includes(query.toLowerCase()) ||
      result.videoTitle.toLowerCase().includes(query.toLowerCase()) ||
      ['algorithm', 'computer', 'programming', 'data', 'science'].some(keyword => 
        query.toLowerCase().includes(keyword.toLowerCase())
      )
    )
    .slice(0, limit);

  // If no relevant results, return first few results
  return filteredResults.length > 0 ? filteredResults : fallbackResults.slice(0, limit);
}

function generateRealisticResults(query: string, limit: number) {
  // Validate input
  if (!query || typeof query !== 'string') {
    throw new Error(`Invalid query: ${query}`);
  }
  
  // Define the result type
  type SearchResult = {
    videoTitle: string;
    transcript: string;
    timestamp: string;
    videoUrl: string;
    relevanceScore: number;
  };

  // Database of realistic programming content based on common topics
  const contentDatabase: Record<string, SearchResult[]> = {
    'python': [
      {
        videoTitle: "Python Programming Fundamentals - Complete Course",
        transcript: `In this comprehensive Python tutorial, we cover the fundamentals of Python programming. Starting with basic syntax, variables, and data types, we explore how Python's simplicity makes it perfect for beginners. Python's readable syntax allows developers to express concepts in fewer lines of code compared to languages like C++ or Java.`,
        timestamp: "12:45",
        videoUrl: "https://youtube.com/watch?v=python101",
        relevanceScore: 0.98
      },
      {
        videoTitle: "Data Structures and Algorithms in Python",
        transcript: `Understanding data structures is crucial for efficient Python programming. In this section, we implement lists, dictionaries, sets, and tuples. Python's built-in data structures are optimized for performance and provide elegant solutions for complex problems. We'll explore list comprehensions, dictionary methods, and set operations.`,
        timestamp: "08:30",
        videoUrl: "https://youtube.com/watch?v=python-ds",
        relevanceScore: 0.95
      },
      {
        videoTitle: "Machine Learning with Python and Scikit-learn",
        transcript: `Python has become the go-to language for machine learning due to libraries like scikit-learn, pandas, and numpy. We'll build our first ML model using Python, covering data preprocessing, feature selection, and model evaluation. Python's ecosystem makes machine learning accessible to developers of all levels.`,
        timestamp: "15:20",
        videoUrl: "https://youtube.com/watch?v=python-ml",
        relevanceScore: 0.92
      }
    ],
    'algorithm': [
      {
        videoTitle: "Sorting Algorithms Explained - Quick Sort vs Merge Sort",
        transcript: `Sorting algorithms are fundamental to computer science. In this video, we implement and compare different sorting algorithms including bubble sort, quick sort, and merge sort. Understanding the time complexity of each algorithm helps us choose the right approach for different scenarios. Quick sort has an average case of O(n log n) but can degrade to O(n²) in worst cases.`,
        timestamp: "18:45",
        videoUrl: "https://youtube.com/watch?v=sorting-algos",
        relevanceScore: 0.97
      },
      {
        videoTitle: "Graph Algorithms - BFS and DFS Implementation",
        transcript: `Graph algorithms are essential for solving complex problems involving networks and relationships. We implement breadth-first search (BFS) and depth-first search (DFS) algorithms from scratch. These algorithms form the foundation for more advanced graph problems like shortest path finding and cycle detection in networks.`,
        timestamp: "25:12",
        videoUrl: "https://youtube.com/watch?v=graph-algos",
        relevanceScore: 0.94
      },
      {
        videoTitle: "Dynamic Programming Algorithms Tutorial",
        transcript: `Dynamic programming is an algorithmic technique for solving optimization problems by breaking them down into simpler subproblems. We explore classic examples like the Fibonacci sequence, knapsack problem, and longest common subsequence. Understanding when and how to apply dynamic programming algorithms is crucial for efficient problem solving.`,
        timestamp: "22:35",
        videoUrl: "https://youtube.com/watch?v=dp-algos",
        relevanceScore: 0.91
      }
    ],
    'javascript': [
      {
        videoTitle: "Modern JavaScript ES6+ Features",
        transcript: `JavaScript has evolved significantly with ES6 and beyond. We explore arrow functions, destructuring, async/await, and modules. These modern JavaScript features help write cleaner, more maintainable code. Understanding these concepts is essential for modern web development and frameworks like React and Vue.`,
        timestamp: "14:20",
        videoUrl: "https://youtube.com/watch?v=modern-js",
        relevanceScore: 0.96
      },
      {
        videoTitle: "Asynchronous JavaScript - Promises and Async/Await",
        transcript: `Asynchronous programming in JavaScript is crucial for handling operations like API calls and file operations. We dive deep into Promises, async/await syntax, and the event loop. Understanding how JavaScript handles asynchronous operations prevents common pitfalls and improves application performance.`,
        timestamp: "19:10",
        videoUrl: "https://youtube.com/watch?v=async-js",
        relevanceScore: 0.93
      }
    ],
    'machine learning': [
      {
        videoTitle: "Introduction to Machine Learning Concepts",
        transcript: `Machine learning is transforming how we solve complex problems. This introduction covers supervised learning, unsupervised learning, and reinforcement learning. We explore how algorithms learn from data to make predictions and decisions. Understanding the different types of machine learning helps choose the right approach for your problem.`,
        timestamp: "16:45",
        videoUrl: "https://youtube.com/watch?v=ml-intro",
        relevanceScore: 0.98
      },
      {
        videoTitle: "Neural Networks and Deep Learning Fundamentals",
        transcript: `Neural networks form the backbone of deep learning. We build a simple neural network from scratch to understand concepts like forward propagation, backpropagation, and gradient descent. Deep learning has revolutionized fields like computer vision, natural language processing, and speech recognition.`,
        timestamp: "28:30",
        videoUrl: "https://youtube.com/watch?v=neural-nets",
        relevanceScore: 0.95
      }
    ]
  };

  // Default programming content for other queries
  const defaultContent: SearchResult[] = [
    {
      videoTitle: `Programming Tutorial - ${query.charAt(0).toUpperCase() + query.slice(1)} Concepts`,
      transcript: `In this comprehensive tutorial, we explore ${query} concepts and their practical applications in software development. Understanding ${query} is essential for building efficient and scalable applications. We cover best practices, common patterns, and real-world examples.`,
      timestamp: "10:15",
      videoUrl: "https://youtube.com/watch?v=programming-tutorial",
      relevanceScore: 0.85
    },
    {
      videoTitle: `Advanced ${query.charAt(0).toUpperCase() + query.slice(1)} Techniques`,
      transcript: `This advanced tutorial dives deep into ${query} implementation details and optimization techniques. We explore how professionals use ${query} in production environments and discuss performance considerations and best practices for scaling applications.`,
      timestamp: "20:45",
      videoUrl: "https://youtube.com/watch?v=advanced-techniques",
      relevanceScore: 0.82
    }
  ];

  // Find matching content
  const queryLower = query.toLowerCase();
  let results: SearchResult[] = [];

  // Check for exact matches first
  if (contentDatabase[queryLower]) {
    results = contentDatabase[queryLower];
  } else {
    // Check for partial matches
    for (const [key, content] of Object.entries(contentDatabase)) {
      if (queryLower.includes(key) || key.includes(queryLower)) {
        results = content;
        break;
      }
    }
  }

  // If no matches found, use default content
  if (results.length === 0) {
    results = defaultContent;
  }

  return results.slice(0, limit);
}

// Function to search database from remote URL (ngrok, etc.)
async function searchRemoteDatabase(query: string, limit: number) {
  try {
    const databaseUrl = process.env.DATABASE_FILE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_FILE_URL not provided');
    }
    
    console.log(`🌐 Downloading database from: ${databaseUrl}`);
    
    // Download the database file
    const response = await fetch(databaseUrl);
    if (!response.ok) {
      throw new Error(`Failed to download database: ${response.status}`);
    }
    
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    // Save to temporary file
    const tempDir = os.tmpdir();
    const isCompressed = databaseUrl.includes('.gz');
    const tempDbPath = path.join(tempDir, isCompressed ? 'remote_transcript_vectors.db.gz' : 'remote_transcript_vectors.db');
    const finalDbPath = path.join(tempDir, 'remote_transcript_vectors.db');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempDbPath, buffer);
    
    console.log(`💾 Database downloaded to: ${tempDbPath}`);
    console.log(`📊 Downloaded size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    
    // Decompress if needed
    if (isCompressed) {
      console.log('📦 Decompressing database...');
      const zlib = await import('zlib');
      const compressedData = fs.readFileSync(tempDbPath);
      const decompressedData = zlib.gunzipSync(compressedData);
      fs.writeFileSync(finalDbPath, decompressedData);
      console.log(`✅ Decompressed to: ${finalDbPath}`);
      
      // Clean up compressed file
      fs.unlinkSync(tempDbPath);
    }
    
    // Import database module and search
    const VectorDatabaseModule = await import('../../services/vectorDatabase.js');
    const VectorDatabase = VectorDatabaseModule.default;
    
    const db = new VectorDatabase(finalDbPath);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test database
    const testQuery = new Promise((resolve, reject) => {
      if (!db.db) {
        reject(new Error('Database connection not initialized'));
        return;
      }
      
      db.db.get("SELECT COUNT(*) as count FROM transcript_segments", (err: any, row: any) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🎯 Remote database has ${row?.count || 0} transcript segments`);
          resolve(row);
        }
      });
    });
    
    await testQuery;
    
    // Search the database
    const searchResults = await db.searchTranscripts(query, limit);
    
    if (!searchResults || searchResults.length === 0) {
      throw new Error('No results found in remote database');
    }
    
    // Format results
    const formattedResults = searchResults.map((result: any) => {
      const firstSegment = result.matchingSegments?.[0];
      return {
        videoTitle: result.video?.title || 'Unknown Video',
        transcript: firstSegment?.text || result.video?.title || '',
        timestamp: formatTime(firstSegment?.timestamp || 0),
        videoUrl: result.video?.url || 'https://youtube.com/watch?v=unknown',
        relevanceScore: Math.min(result.relevanceScore || 0.5, 1.0)
      };
    });
    
    // Clean up temp file
    try {
      fs.unlinkSync(finalDbPath);
    } catch (e) {
      console.log('⚠️ Could not clean up temp file:', e);
    }
    
    // Close database
    if (db.close) {
      await db.close();
    }
    
    console.log(`✅ Remote database search successful: ${formattedResults.length} results`);
    return formattedResults.slice(0, limit);
    
  } catch (error) {
    console.log('❌ Remote database search failed:', error.message);
    throw error;
  }
}
