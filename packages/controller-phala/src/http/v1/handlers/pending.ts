import { normalizeRepoUrl } from '@gitsplits/shared';
import { nearTool } from '../../../tools/near';
import { TPendingListRequest } from '../schemas';

function looksLikeRepo(input: string): boolean {
  return input.includes('/') || input.includes('github.com');
}

export async function listPending(req: TPendingListRequest) {
  const target = req.target.trim();

  if (looksLikeRepo(target)) {
    const repoUrl = normalizeRepoUrl(target);
    const split = await nearTool.getSplit(repoUrl);
    if (!split) {
      return { target: repoUrl, kind: 'repo', split: null, pending: [] };
    }

    const pending: Array<{ githubUsername: string; claims: unknown[] }> = [];
    for (const contributor of (split as any).contributors || []) {
      const claims = await nearTool.getPendingDistributions(contributor.github_username);
      if (claims && claims.length > 0) {
        pending.push({ githubUsername: contributor.github_username, claims });
      }
    }

    return {
      target: repoUrl,
      kind: 'repo',
      splitId: (split as any).id,
      pending,
    };
  }

  const githubUsername = target.replace(/^@/, '');
  const claims = await nearTool.getPendingDistributions(githubUsername);
  return {
    target: githubUsername,
    kind: 'user',
    pending: claims || [],
  };
}
