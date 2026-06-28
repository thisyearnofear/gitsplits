import { normalizeRepoUrl } from '@gitsplits/shared';
import { githubTool } from '../../../tools/github';
import { eigenaiTool } from '../../../tools/eigenai';
import { TRepoAnalyzeRequest, TRepoInsightRequest } from '../schemas';

export async function analyzeRepo(req: TRepoAnalyzeRequest) {
  const repoUrl = normalizeRepoUrl(req.repoUrl);
  const analysis = await githubTool.analyze(repoUrl);

  return {
    repoUrl,
    owner: (analysis as any).owner ?? null,
    repo: (analysis as any).repo ?? null,
    totalContributions: (analysis as any).totalContributions ?? 0,
    contributors: analysis.contributors || [],
  };
}

export async function insightRepo(req: TRepoInsightRequest) {
  const repoUrl = normalizeRepoUrl(req.repoUrl);
  const result = await eigenaiTool.analyzeContributions(repoUrl, req.contributors);

  return {
    repoUrl,
    analysis: result.analysis,
    qualityScores: result.qualityScores ?? [],
    signature: result.signature ?? null,
    model: result.model ?? null,
    explorerUrl: result.explorerUrl ?? null,
    mock: Boolean(result.mock),
  };
}
