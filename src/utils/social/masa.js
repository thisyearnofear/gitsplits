const MasaAPI = require('../../../scripts/twitter-integration/masa-api');

/**
 * Helper function to search for tweets mentioning a query using Masa API
 * @param {string} query - The search query
 * @param {string} sinceId - Only return results newer than this ID
 * @returns {Promise<Array>} - Array of tweet objects
 */
async function searchMasaTweets(query, sinceId = null) {
  const masaClient = new MasaAPI({
    debug: process.env.NODE_ENV !== 'production'
  });
  
  // Clean query: remove @ if it's there as searchMentions adds it if needed or expects just the handle
  // Actually masa-api.js adds @ to the query: query: `@${username}`
  const cleanUsername = query.startsWith('@') ? query.substring(1) : query;
  
  return await masaClient.searchMentions(cleanUsername, { sinceId });
}

module.exports = {
  searchMasaTweets
};
