/**
 * Format timestamp in seconds to MM:SS or HH:MM:SS format
 * @param {number} seconds - Timestamp in seconds
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Create a timestamped YouTube URL
 * @param {string} videoId - YouTube video ID
 * @param {number} timestamp - Timestamp in seconds
 * @returns {string} YouTube URL with timestamp
 */
function createTimestampedUrl(videoId, timestamp) {
  const seconds = Math.floor(timestamp);
  return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
}

/**
 * Validate YouTube URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid YouTube URL
 */
function isValidYouTubeUrl(url) {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=/,
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/,
    /^https?:\/\/youtu\.be\//
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

/**
 * Clean and normalize text for better matching
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Calculate similarity between two strings using Jaccard similarity
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
  const set1 = new Set(cleanText(str1).split(/\s+/));
  const set2 = new Set(cleanText(str2).split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Highlight matching terms in text
 * @param {string} text - Original text
 * @param {Array} terms - Terms to highlight
 * @returns {string} Text with highlighted terms
 */
function highlightTerms(text, terms) {
  let highlightedText = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    highlightedText = highlightedText.replace(regex, `**${term}**`);
  });
  
  return highlightedText;
}

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 150) {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Group search results by relevance score ranges
 * @param {Array} results - Search results
 * @returns {Object} Grouped results
 */
function groupResultsByRelevance(results) {
  const groups = {
    high: [], // 0.7+
    medium: [], // 0.4-0.7
    low: [] // <0.4
  };
  
  results.forEach(result => {
    if (result.relevanceScore >= 0.7) {
      groups.high.push(result);
    } else if (result.relevanceScore >= 0.4) {
      groups.medium.push(result);
    } else {
      groups.low.push(result);
    }
  });
  
  return groups;
}

/**
 * Generate search result summary statistics
 * @param {Array} results - Search results
 * @returns {Object} Summary statistics
 */
function generateSearchStats(results) {
  if (!results || results.length === 0) {
    return {
      totalResults: 0,
      averageRelevance: 0,
      highRelevanceCount: 0,
      totalMatchingSegments: 0
    };
  }
  
  const totalResults = results.length;
  const averageRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / totalResults;
  const highRelevanceCount = results.filter(r => r.relevanceScore >= 0.7).length;
  const totalMatchingSegments = results.reduce((sum, r) => sum + (r.matchingSegments?.length || 0), 0);
  
  return {
    totalResults,
    averageRelevance: Math.round(averageRelevance * 1000) / 1000,
    highRelevanceCount,
    totalMatchingSegments
  };
}

module.exports = {
  formatTimestamp,
  createTimestampedUrl,
  isValidYouTubeUrl,
  cleanText,
  calculateSimilarity,
  highlightTerms,
  truncateText,
  groupResultsByRelevance,
  generateSearchStats
};
