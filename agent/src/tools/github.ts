/**
 * GitHub Tool
 * 
 * Fetches repository data using GitHub App authentication.
 */

import { Octokit } from '@octokit/rest';

// Lazy initialization - don't throw on module load
let octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (octokit) return octokit;
  
  const token = process.env.GITHUB_TOKEN;
  
  if (token) {
    // Personal access token
    console.log('Using GitHub personal token');
    octokit = new Octokit({ auth: token });
  } else {
    // Unauthenticated (public repos only, 60 requests/hour)
    console.log('Using unauthenticated GitHub access');
    octokit = new Octokit();
  }
  
  return octokit;
}

export const githubTool = {
  name: 'github',
  
  /**
   * Analyze repository contributions
   */
  async analyze(repoUrl: string) {
    const client = getOctokit();
    
    // Parse owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    const [, owner, repo] = match;
    
    // Fetch contributors from GitHub API
    const { data: contributors } = await client.rest.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });
    
    if (contributors.length === 0) {
      return { contributors: [] };
    }
    
    // Calculate total contributions
    const totalContributions = contributors.reduce(
      (sum, c) => sum + (c.contributions || 0), 0
    );
    
    // Calculate percentages
    const analyzedContributors = contributors.map((c) => ({
      username: c.login!,
      commits: c.contributions || 0,
      percentage: totalContributions > 0
        ? Math.round(((c.contributions || 0) / totalContributions) * 100)
        : 0,
    }));
    
    // Sort by contributions (descending)
    analyzedContributors.sort((a, b) => b.commits - a.commits);
    
    return {
      contributors: analyzedContributors,
      totalContributions,
      owner,
      repo,
    };
  },
  
  /**
   * Verify GitHub gist ownership
   */
  async verifyGist(githubUsername: string, code: string) {
    const client = getOctokit();
    
    // Search for gist containing the verification code
    const { data: gists } = await client.rest.gists.listForUser({
      username: githubUsername,
      per_page: 10,
    });
    
    for (const gist of gists) {
      const file = Object.values(gist.files || {})[0] as any;
      const content = file?.content || '';
      if (content.includes(code)) {
        return {
          verified: true,
          gistUrl: gist.html_url,
        };
      }
    }
    
    return { verified: false };
  },
  
  /**
   * Get rate limit status
   */
  async getRateLimit() {
    const client = getOctokit();
    const { data } = await client.rest.rateLimit.get();
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      resetAt: new Date(data.rate.reset * 1000).toISOString(),
    };
  },
};
