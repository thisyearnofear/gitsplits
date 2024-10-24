import axios from "axios";
import { RepoInfo } from "@/types";

export async function getRepoInfo(url: string): Promise<RepoInfo> {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error("Invalid GitHub URL");
  }

  const [, owner, repo] = match;

  try {
    // Ensure the URL is absolute
    const response = await axios.get(
      `http://localhost:3000/api/proxy?owner=${owner}&repo=${repo}`
    );
    const data = response.data;

    // The proxy now includes contributors, so we don't need to fetch them separately
    return data as RepoInfo;
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
      `/api/validate-username?username=${username}`
    );
    return response.data.isValid;
  } catch (error) {
    console.error("Error validating GitHub username:", error);
    return false;
  }
}
