import { NextResponse } from "next/server";
import axios from "axios";
import { SplitContributor } from "@/types";

// Minimum repository age in days to be eligible for splits
const MIN_REPO_AGE_DAYS = 7;

// Minimum time between commits to be considered separate contributions (in hours)
const MIN_COMMIT_INTERVAL_HOURS = 1;

// Suspicious patterns thresholds
const MAX_COMMITS_PER_DAY = 20;
const MIN_LINES_PER_COMMIT = 5;

export async function POST(request: Request) {
  try {
    const { repoUrl } = await request.json();

    if (!repoUrl) {
      return NextResponse.json(
        { error: "Missing repository URL" },
        { status: 400 }
      );
    }

    // Parse the repository URL
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      return NextResponse.json(
        { error: "Invalid repository URL" },
        { status: 400 }
      );
    }

    const [, owner, repo] = repoMatch;

    // Check repository age
    const repoInfo = await getRepositoryInfo(owner, repo);
    const repoAgeInDays = calculateRepoAge(repoInfo.created_at);

    if (repoAgeInDays < MIN_REPO_AGE_DAYS) {
      return NextResponse.json(
        {
          error: "Repository too new",
          message: `Repository must be at least ${MIN_REPO_AGE_DAYS} days old to be eligible for splits`,
        },
        { status: 400 }
      );
    }

    // Get contributors with advanced metrics
    const contributors = await getContributorsWithMetrics(owner, repo);

    // Filter out suspicious contributors
    const filteredContributors = contributors.filter(
      (contributor) => !contributor.suspicious
    );

    // Calculate percentages based on quality-weighted contributions
    const totalQualityScore = filteredContributors.reduce(
      (sum, contributor) => sum + contributor.qualityScore,
      0
    );

    const splitContributors: SplitContributor[] = filteredContributors.map(
      (contributor) => ({
        githubUsername: contributor.username,
        percentage: Math.round(
          (contributor.qualityScore / totalQualityScore) * 10000
        ) / 100, // Round to 2 decimal places
      })
    );

    // Ensure the original creator gets at least 20% if they're still a contributor
    const originalCreator = await getOriginalCreator(owner, repo);
    if (originalCreator) {
      const creatorContributor = splitContributors.find(
        (c) => c.githubUsername.toLowerCase() === originalCreator.toLowerCase()
      );

      if (creatorContributor) {
        if (creatorContributor.percentage < 20) {
          // Adjust other contributors proportionally to give the creator at least 20%
          const adjustment = 20 - creatorContributor.percentage;
          creatorContributor.percentage = 20;

          const otherContributors = splitContributors.filter(
            (c) =>
              c.githubUsername.toLowerCase() !== originalCreator.toLowerCase()
          );

          const totalOtherPercentage = otherContributors.reduce(
            (sum, c) => sum + c.percentage,
            0
          );

          otherContributors.forEach((c) => {
            c.percentage =
              c.percentage -
              (adjustment * (c.percentage / totalOtherPercentage));
          });
        }
      } else {
        // If the creator is not in the contributors list, add them with 20%
        splitContributors.push({
          githubUsername: originalCreator,
          percentage: 20,
        });

        // Adjust other contributors proportionally
        splitContributors
          .filter(
            (c) => c.githubUsername.toLowerCase() !== originalCreator.toLowerCase()
          )
          .forEach((c) => {
            c.percentage = c.percentage * 0.8; // Reduce by 20%
          });
      }
    }

    // Return the contributors with their percentages
    return NextResponse.json({
      success: true,
      repository: {
        owner,
        name: repo,
        age: repoAgeInDays,
        isFork: repoInfo.fork,
        originalCreator,
      },
      contributors: splitContributors,
      suspiciousContributors: contributors
        .filter((c) => c.suspicious)
        .map((c) => c.username),
    });
  } catch (error) {
    console.error("Error analyzing contributions:", error);
    return NextResponse.json(
      { error: "Failed to analyze contributions" },
      { status: 500 }
    );
  }
}

/**
 * Get repository information
 */
async function getRepositoryInfo(owner: string, repo: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error getting repository info:", error);
    throw error;
  }
}

/**
 * Calculate repository age in days
 */
function calculateRepoAge(createdAt: string): number {
  const creationDate = new Date(createdAt);
  const now = new Date();
  const ageInMs = now.getTime() - creationDate.getTime();
  return Math.floor(ageInMs / (1000 * 60 * 60 * 24));
}

/**
 * Get contributors with advanced metrics
 */
async function getContributorsWithMetrics(
  owner: string,
  repo: string
): Promise<any[]> {
  try {
    // Get basic contributor information
    const contributorsResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contributors`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    const contributors = contributorsResponse.data;

    // Get commit history for each contributor
    const contributorsWithMetrics = await Promise.all(
      contributors.map(async (contributor: any) => {
        const username = contributor.login;
        const commits = await getContributorCommits(owner, repo, username);
        
        // Calculate metrics
        const commitDates = commits.map((commit: any) => new Date(commit.commit.author.date));
        commitDates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
        
        // Check for suspicious patterns
        const suspiciousPatterns = detectSuspiciousPatterns(commits);
        
        // Calculate contribution quality score
        const qualityScore = calculateQualityScore(
          contributor.contributions,
          commits,
          suspiciousPatterns
        );
        
        return {
          username,
          contributions: contributor.contributions,
          firstContribution: commitDates.length > 0 ? commitDates[0] : null,
          lastContribution: commitDates.length > 0 ? commitDates[commitDates.length - 1] : null,
          commitFrequency: calculateCommitFrequency(commitDates),
          suspicious: suspiciousPatterns.length > 0,
          suspiciousPatterns,
          qualityScore,
        };
      })
    );

    return contributorsWithMetrics;
  } catch (error) {
    console.error("Error getting contributors with metrics:", error);
    throw error;
  }
}

/**
 * Get commits for a contributor
 */
async function getContributorCommits(
  owner: string,
  repo: string,
  username: string
): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits?author=${username}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error getting commits for ${username}:`, error);
    return [];
  }
}

/**
 * Calculate commit frequency (commits per day)
 */
function calculateCommitFrequency(commitDates: Date[]): number {
  if (commitDates.length < 2) {
    return 0;
  }

  const firstDate = commitDates[0];
  const lastDate = commitDates[commitDates.length - 1];
  const daysDiff =
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysDiff > 0 ? commitDates.length / daysDiff : commitDates.length;
}

/**
 * Detect suspicious contribution patterns
 */
function detectSuspiciousPatterns(commits: any[]): string[] {
  const suspiciousPatterns: string[] = [];

  // Group commits by day
  const commitsByDay = new Map<string, any[]>();
  commits.forEach((commit) => {
    const date = new Date(commit.commit.author.date);
    const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    
    if (!commitsByDay.has(dayKey)) {
      commitsByDay.set(dayKey, []);
    }
    
    commitsByDay.get(dayKey)!.push(commit);
  });

  // Check for too many commits in a single day
  commitsByDay.forEach((dayCommits, day) => {
    if (dayCommits.length > MAX_COMMITS_PER_DAY) {
      suspiciousPatterns.push(`too_many_commits_per_day:${day}`);
    }
  });

  // Check for commits that are too close together in time
  for (let i = 1; i < commits.length; i++) {
    const prevDate = new Date(commits[i - 1].commit.author.date);
    const currDate = new Date(commits[i].commit.author.date);
    
    const hoursDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff < MIN_COMMIT_INTERVAL_HOURS) {
      suspiciousPatterns.push(`commits_too_close:${prevDate.toISOString()}_${currDate.toISOString()}`);
    }
  }

  // Check for commits with very few changes
  commits.forEach((commit) => {
    // In a real implementation, you would analyze the commit diff
    // For now, we'll use a placeholder check
    if (commit.commit.message.length < 10) {
      suspiciousPatterns.push(`small_commit:${commit.sha}`);
    }
  });

  return suspiciousPatterns;
}

/**
 * Calculate contribution quality score
 */
function calculateQualityScore(
  contributions: number,
  commits: any[],
  suspiciousPatterns: string[]
): number {
  // Base score is the number of contributions
  let score = contributions;

  // Penalize for suspicious patterns
  score = score * Math.max(0.5, 1 - suspiciousPatterns.length * 0.1);

  // Bonus for consistent contributions over time
  const commitDates = commits.map((commit) => new Date(commit.commit.author.date));
  if (commitDates.length > 0) {
    const firstDate = commitDates[0];
    const lastDate = commitDates[commitDates.length - 1];
    const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 30) {
      // Bonus for long-term contributors
      score = score * (1 + Math.min(0.5, daysDiff / 365));
    }
  }

  // Bonus for meaningful commit messages
  const meaningfulCommits = commits.filter(
    (commit) => commit.commit.message.length > 20
  );
  if (meaningfulCommits.length > 0) {
    score = score * (1 + Math.min(0.2, meaningfulCommits.length / commits.length));
  }

  return score;
}

/**
 * Get the original creator of the repository
 */
async function getOriginalCreator(owner: string, repo: string): Promise<string | null> {
  try {
    const repoInfo = await getRepositoryInfo(owner, repo);
    
    // If it's a fork, get the parent repository's owner
    if (repoInfo.fork && repoInfo.parent) {
      return repoInfo.parent.owner.login;
    }
    
    // Otherwise, return the repository owner
    return repoInfo.owner.login;
  } catch (error) {
    console.error("Error getting original creator:", error);
    return null;
  }
}
