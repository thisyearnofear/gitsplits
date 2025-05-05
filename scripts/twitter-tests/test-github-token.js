// Test script for GitHub token
const { Octokit } = require("@octokit/rest");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Check if GitHub token is set
if (!process.env.GITHUB_TOKEN) {
  console.error("Error: GITHUB_TOKEN is not defined in environment variables");
  process.exit(1);
}

console.log("GitHub token found in environment variables");

// Initialize GitHub client
const githubClient = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Test repository to analyze
const testRepo = "near/near-sdk-rs";
const [owner, repo] = testRepo.split("/");

async function testGitHubToken() {
  try {
    console.log(`Testing GitHub token with repository: ${testRepo}`);
    
    // Test getting repository info
    console.log("Fetching repository info...");
    const repoInfo = await githubClient.repos.get({ owner, repo });
    console.log(`Repository exists: ${repoInfo.data.full_name}`);
    
    // Test getting contributors
    console.log("Fetching contributors...");
    const { data: contributors } = await githubClient.repos.listContributors({
      owner,
      repo,
      per_page: 5,
    });
    
    console.log(`Found ${contributors.length} contributors:`);
    contributors.forEach((contributor, index) => {
      console.log(`${index + 1}. ${contributor.login}: ${contributor.contributions} contributions`);
    });
    
    console.log("\nGitHub token is working correctly!");
    return true;
  } catch (error) {
    console.error("Error testing GitHub token:", error.message);
    
    if (error.status === 401) {
      console.error("Authentication failed. The GitHub token is invalid or expired.");
    } else if (error.status === 403) {
      console.error("Rate limit exceeded or insufficient permissions.");
    } else if (error.status === 404) {
      console.error(`Repository ${testRepo} not found.`);
    }
    
    return false;
  }
}

// Run the test
testGitHubToken();
