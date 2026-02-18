import { NextResponse } from "next/server";
import axios from "axios";
import { VerificationLevel } from "@/types";

export async function POST(request: Request) {
  try {
    const { repoUrl, twitterUsername, githubUsername } = await request.json();

    if (!repoUrl || !twitterUsername) {
      return NextResponse.json(
        { error: "Missing required parameters" },
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

    // If githubUsername is not provided, try to get it from the user's verification
    const effectiveGithubUsername = githubUsername || await getGitHubUsername(twitterUsername);
    
    if (!effectiveGithubUsername) {
      return NextResponse.json(
        { 
          error: "GitHub identity not verified", 
          message: "Please verify your GitHub identity at https://gitsplits.vercel.app/verify or DM @gitsplits 'verify your-github-username'"
        },
        { status: 400 }
      );
    }

    // Check if the user has admin permissions on the repository
    const hasAdminPermissions = await checkRepositoryPermissions(
      effectiveGithubUsername,
      owner,
      repo
    );

    if (!hasAdminPermissions) {
      return NextResponse.json(
        { 
          error: "Insufficient permissions", 
          message: "You need admin permissions on the repository to create a split"
        },
        { status: 403 }
      );
    }

    // Check if the repository is a fork
    const isFork = await checkIfFork(owner, repo);
    
    // If it's a fork, verify the fork relationship
    if (isFork) {
      const isValidFork = await verifyForkRelationship(owner, repo);
      
      if (!isValidFork) {
        return NextResponse.json(
          { 
            error: "Invalid fork", 
            message: "The repository appears to be a fork, but we couldn't verify its relationship to the parent repository"
          },
          { status: 400 }
        );
      }
    }

    // All checks passed, return success
    return NextResponse.json({
      success: true,
      owner: effectiveGithubUsername,
      repository: `${owner}/${repo}`,
      isFork,
      verificationLevel: VerificationLevel.Repository,
    });
  } catch (error) {
    console.error("Error verifying repository ownership:", error);
    return NextResponse.json(
      { error: "Failed to verify repository ownership" },
      { status: 500 }
    );
  }
}

/**
 * Get the GitHub username for a Twitter username
 */
async function getGitHubUsername(twitterUsername: string): Promise<string | null> {
  try {
    // In a real implementation, this would query the database for the user's GitHub identity
    // For now, we'll return null to indicate that the user needs to verify their GitHub identity
    return null;
  } catch (error) {
    console.error("Error getting GitHub username:", error);
    return null;
  }
}

/**
 * Check if the user has admin permissions on the repository
 */
async function checkRepositoryPermissions(
  username: string,
  owner: string,
  repo: string
): Promise<boolean> {
  try {
    // If the user is the owner, they have admin permissions
    if (username.toLowerCase() === owner.toLowerCase()) {
      return true;
    }

    // Check if the user is a collaborator with admin permissions
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}/permission`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    const permission = response.data.permission;
    return permission === "admin";
  } catch (error) {
    console.error("Error checking repository permissions:", error);
    return false;
  }
}

/**
 * Check if the repository is a fork
 */
async function checkIfFork(owner: string, repo: string): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    return response.data.fork === true;
  } catch (error) {
    console.error("Error checking if repository is a fork:", error);
    return false;
  }
}

/**
 * Verify the fork relationship
 */
async function verifyForkRelationship(
  owner: string,
  repo: string
): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    // Check if the repository has a parent
    if (response.data.parent) {
      // In a real implementation, you might want to do additional checks here
      // For example, checking if the fork is up-to-date with the parent
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error verifying fork relationship:", error);
    return false;
  }
}
