/**
 * GitHub Tool
 * 
 * Fetches repository data using GitHub authentication.
 * Priority: GitHub App (production) -> personal token fallback.
 */

import { Octokit } from '@octokit/rest';
import crypto from 'crypto';
import { getGitHubAuthMode } from '../config';

let appOctokit: Octokit | null = null;
let tokenOctokit: Octokit | null = null;
const installationClientCache = new Map<number, Octokit>();

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n');
}

function getTokenClient(): Octokit {
  if (tokenOctokit) return tokenOctokit;
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is not configured.');
  }
  console.log('[GitHub] Using personal access token auth');
  tokenOctokit = new Octokit({ auth: token });
  return tokenOctokit;
}

async function getAppClient(): Promise<Octokit> {
  if (appOctokit) return appOctokit;
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('GitHub App credentials are not configured.');
  }

  console.log('[GitHub] Using GitHub App auth');
  appOctokit = new Octokit();
  return appOctokit;
}

function parseRepo(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/?#]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function getInstallationClient(owner: string, repo: string): Promise<Octokit> {
  const appClient = await getAppClient();
  const appId = process.env.GITHUB_APP_ID!;
  const privateKey = normalizePrivateKey(process.env.GITHUB_PRIVATE_KEY!);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId,
  };
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  const header = { alg: 'RS256', typ: 'JWT' };
  const tokenInput = `${encode(header)}.${encode(payload)}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(tokenInput);
  signer.end();
  const signature = signer
    .sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const appJwt = `${tokenInput}.${signature}`;

  let installation: any;
  try {
    installation = await appClient.request('GET /repos/{owner}/{repo}/installation', {
      owner,
      repo,
      headers: {
        authorization: `Bearer ${appJwt}`,
        'x-github-api-version': '2022-11-28',
      },
    });
  } catch (error: any) {
    if (error?.status === 404) {
      throw new Error(
        `[GitHub] App is not installed on ${owner}/${repo}. Install the app on the canary repository or update TEST_* repo env vars.`
      );
    }
    throw error;
  }

  const installationId = installation.data.id;
  const cached = installationClientCache.get(installationId);
  if (cached) return cached;

  const tokenResponse = await appClient.request(
    'POST /app/installations/{installation_id}/access_tokens',
    {
      installation_id: installationId,
      headers: {
        authorization: `Bearer ${appJwt}`,
        'x-github-api-version': '2022-11-28',
      },
    }
  );

  const client = new Octokit({ auth: tokenResponse.data.token });
  installationClientCache.set(installationId, client);
  return client;
}

async function getRepoClient(owner: string, repo: string): Promise<Octokit> {
  const mode = getGitHubAuthMode();

  if (mode === 'app') {
    try {
      return await getInstallationClient(owner, repo);
    } catch (error: any) {
      const appMissingInstallation =
        error?.status === 404 ||
        String(error?.message || '').includes('App is not installed');
      if (appMissingInstallation && process.env.GITHUB_TOKEN) {
        console.warn(
          `[GitHub] App not installed on ${owner}/${repo}; falling back to GITHUB_TOKEN for read-only analysis.`
        );
        return getTokenClient();
      }
      throw error;
    }
  }
  if (mode === 'token') {
    return getTokenClient();
  }

  if (process.env.AGENT_MODE === 'production') {
    throw new Error(
      'No GitHub auth available in production. Configure GitHub App credentials.'
    );
  }

  console.log('[GitHub] Using unauthenticated access (non-production fallback)');
  return new Octokit();
}

export const githubTool = {
  name: 'github',
  
  /**
   * Analyze repository contributions
   */
  async analyze(repoUrl: string) {
    const { owner, repo } = parseRepo(repoUrl);
    const client = await getRepoClient(owner, repo);
    
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
    const mode = getGitHubAuthMode();
    const client =
      mode === 'app'
        ? await getAppClient()
        : mode === 'token'
          ? getTokenClient()
          : new Octokit();
    
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
    const mode = getGitHubAuthMode();
    const client =
      mode === 'app'
        ? await getAppClient()
        : mode === 'token'
          ? getTokenClient()
          : new Octokit();
    const { data } = await client.rest.rateLimit.get();
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      resetAt: new Date(data.rate.reset * 1000).toISOString(),
    };
  },

  async probeAuth(repoUrl: string) {
    const { owner, repo } = parseRepo(repoUrl);
    const client = await getRepoClient(owner, repo);
    const { data } = await client.rest.repos.get({ owner, repo });

    return {
      ok: true,
      authMode: getGitHubAuthMode(),
      repo: data.full_name,
      private: data.private,
    };
  },
};
