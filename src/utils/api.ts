// utils/api.ts

import axios from "axios";
import { RepoInfo as RepoInfoType, Contributor } from "@/types";

export async function getRepoInfo(url: string): Promise<RepoInfoType> {
  const [, owner, repo] = url.match(/github\.com\/([^\/]+)\/([^\/]+)/) || [];
  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL");
  }

  try {
    const repoResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`
    );
    const repoData = repoResponse.data;

    const contributorsResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contributors`
    );
    const contributors = contributorsResponse.data;

    let originalRepo = null;
    if (repoData.fork) {
      const originalRepoResponse = await axios.get(repoData.source.url);
      originalRepo = originalRepoResponse.data;
    }

    return {
      name: repoData.name,
      owner: repoData.owner.login,
      isFork: repoData.fork,
      originalRepo: originalRepo
        ? {
            name: originalRepo.name,
            owner: originalRepo.owner.login,
          }
        : null,
      contributors: contributors.map((c: Contributor) => ({
        username: c.login,
        contributions: c.contributions,
        avatar_url: c.avatar_url,
      })),
    };
  } catch (error) {
    console.error("Error fetching repo info:", error);
    throw error;
  }
}

export async function validateGitHubUsername(
  username: string
): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://api.github.com/users/${username}`
    );
    return response.status === 200;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return false;
    }
    throw error;
  }
}
