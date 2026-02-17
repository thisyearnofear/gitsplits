import axios from "axios";
import { RepoInfo } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export async function getRepoInfo(url: string): Promise<RepoInfo> {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error("Invalid GitHub URL");
  }

  const [, owner, repo] = match;

  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/proxy?owner=${owner}&repo=${repo}`
    );
    const data = response.data;

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
