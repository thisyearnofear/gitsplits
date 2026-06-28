import { normalizeRepoUrl } from '@gitsplits/shared';
import { nearTool } from '../../../tools/near';
import { TSplitGetRequest, TSplitCreateRequest, TSplitUpdateRequest } from '../schemas';

function assertPercentSum(contributors: Array<{ percentage: number }>) {
  const total = contributors.reduce((sum, c) => sum + Number(c.percentage || 0), 0);
  if (total < 95 || total > 105) {
    throw Object.assign(new Error(`Contributor percentages sum to ${total}, expected ~100`), {
      statusCode: 400,
      code: 'invalid_percentages',
    });
  }
}

export async function getSplit(req: TSplitGetRequest) {
  const repoUrl = normalizeRepoUrl(req.repoUrl);
  const split = await nearTool.getSplit(repoUrl);
  return { repoUrl, split: split ?? null };
}

export async function createSplit(req: TSplitCreateRequest) {
  const repoUrl = normalizeRepoUrl(req.repoUrl);
  assertPercentSum(req.contributors);

  const split = await nearTool.createSplit({
    repoUrl,
    owner: req.owner,
    contributors: req.contributors,
  });

  return { repoUrl, splitId: split.id, contributors: split.contributors };
}

export async function updateSplit(req: TSplitUpdateRequest) {
  assertPercentSum(req.contributors);
  const split = await nearTool.updateSplit({
    splitId: req.splitId,
    contributors: req.contributors,
  });
  return { splitId: split.id, contributors: split.contributors };
}
