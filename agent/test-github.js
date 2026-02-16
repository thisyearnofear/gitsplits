/**
 * Test GitHub integration
 */

require('dotenv').config();

const { Octokit } = require('@octokit/rest');

async function test() {
  console.log('Testing GitHub Integration\n');
  console.log('===========================\n');
  
  // Use unauthenticated Octokit for public repos
  const octokit = new Octokit();
  
  try {
    // Test repo analysis (public repo)
    console.log('Testing repo analysis...');
    const { data: repo } = await octokit.rest.repos.get({
      owner: 'near',
      repo: 'near-sdk-rs',
    });
    console.log('✅ Repo found:', repo.full_name);
    console.log('Stars:', repo.stargazers_count);
    console.log('');
    
    // Get contributors
    const { data: contributors } = await octokit.rest.repos.listContributors({
      owner: 'near',
      repo: 'near-sdk-rs',
      per_page: 5,
    });
    
    console.log('Top Contributors:');
    contributors.forEach((c, i) => {
      console.log(`${i + 1}. ${c.login}: ${c.contributions} commits`);
    });
    console.log('');
    
    // Calculate percentages
    const total = contributors.reduce((sum, c) => sum + c.contributions, 0);
    console.log('Contribution percentages:');
    contributors.forEach((c) => {
      const pct = ((c.contributions / total) * 100).toFixed(1);
      console.log(`  ${c.login}: ${pct}%`);
    });
    
    console.log('');
    console.log('✅ GitHub integration working!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
