// Test script for GitHub API integration
const { Octokit } = require("@octokit/rest");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

// GitHub configuration
const githubConfig = {
  auth: process.env.GITHUB_TOKEN,
};

// Initialize GitHub client
const githubClient = new Octokit(githubConfig);

/**
 * Parse GitHub URL
 * @param {string} url - GitHub URL or repo name
 * @returns {Object} - Owner and repo
 */
function parseGitHubUrl(url) {
  // Handle full URLs
  if (url.startsWith("http")) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }
  
  // Handle github.com/owner/repo format
  if (url.startsWith("github.com/")) {
    const parts = url.replace("github.com/", "").split("/");
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  }
  
  // Handle owner/repo format
  const parts = url.split("/");
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  
  throw new Error(`Invalid GitHub URL or repo name: ${url}`);
}

/**
 * Check if repository exists
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<boolean>} - Whether the repository exists
 */
async function checkRepositoryExists(owner, repo) {
  try {
    await githubClient.repos.get({ owner, repo });
    return true;
  } catch (error) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Get repository contributors
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Contributors
 */
async function getRepositoryContributors(owner, repo) {
  try {
    const { data } = await githubClient.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });
    
    return data;
  } catch (error) {
    console.error(`Error getting contributors for ${owner}/${repo}:`, error.message);
    
    // Handle specific error cases
    if (error.status === 404) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    } else if (error.status === 403) {
      throw new Error(`Rate limit exceeded or access denied for ${owner}/${repo}`);
    } else {
      throw error;
    }
  }
}

/**
 * Analyze repository contributions
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Contributors with percentages
 */
async function analyzeContributions(owner, repo) {
  try {
    // Check if repository exists
    const exists = await checkRepositoryExists(owner, repo);
    if (!exists) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }
    
    // Get contributors
    const contributors = await getRepositoryContributors(owner, repo);
    
    if (!contributors || contributors.length === 0) {
      throw new Error(`No contributors found for ${owner}/${repo}`);
    }
    
    console.log(`Found ${contributors.length} contributors for ${owner}/${repo}`);
    
    // Calculate total contributions
    const totalContributions = contributors.reduce(
      (sum, contributor) => sum + contributor.contributions,
      0
    );
    
    // Calculate percentages
    const contributorsWithPercentages = contributors.map((contributor) => {
      const percentage = (contributor.contributions / totalContributions) * 100;
      const percentageFormatted = percentage.toFixed(2);
      
      // Convert percentage to the format expected by the contract (24 decimal places)
      const percentageForContract = Math.floor(percentage * 1e24 / 100).toString();
      
      return {
        github_username: contributor.login,
        account_id: null, // Will be linked later if user verifies
        contributions: contributor.contributions,
        percentage: percentageFormatted + "%",
        percentage_for_contract: percentageForContract,
      };
    });
    
    return contributorsWithPercentages;
  } catch (error) {
    console.error(`Error analyzing contributions for ${owner}/${repo}:`, error.message);
    throw error;
  }
}

/**
 * Test repository analysis
 * @param {string} repoUrl - Repository URL or name
 */
async function testRepositoryAnalysis(repoUrl) {
  try {
    console.log(`\n--- Testing Repository Analysis for ${repoUrl} ---`);
    
    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(repoUrl);
    console.log(`Parsed as owner: ${owner}, repo: ${repo}`);
    
    // Analyze contributions
    const contributors = await analyzeContributions(owner, repo);
    
    console.log("\nContributors:");
    contributors.forEach((contributor) => {
      console.log(`- ${contributor.github_username}: ${contributor.percentage} (${contributor.contributions} contributions)`);
    });
    
    // Verify total percentage adds up to 100%
    const totalPercentage = contributors.reduce(
      (sum, contributor) => sum + parseFloat(contributor.percentage),
      0
    );
    
    console.log(`\nTotal percentage: ${totalPercentage.toFixed(2)}%`);
    
    // Verify total percentage for contract adds up to 100%
    const totalPercentageForContract = contributors.reduce(
      (sum, contributor) => sum + BigInt(contributor.percentage_for_contract),
      BigInt(0)
    );
    
    const expectedTotal = BigInt("100000000000000000000000"); // 100% with 24 decimal places
    console.log(`\nTotal percentage for contract: ${totalPercentageForContract}`);
    console.log(`Expected total: ${expectedTotal}`);
    console.log(`Difference: ${totalPercentageForContract - expectedTotal}`);
    
    return contributors;
  } catch (error) {
    console.error("Error testing repository analysis:", error.message);
    return null;
  }
}

/**
 * Run tests
 */
async function runTests() {
  // Test with a valid repository
  await testRepositoryAnalysis("near/near-sdk-rs");
  
  // Test with a non-existent repository
  await testRepositoryAnalysis("near/non-existent-repo");
  
  // Test with a repository URL
  await testRepositoryAnalysis("github.com/near/near-api-js");
}

// Run the tests
runTests();
