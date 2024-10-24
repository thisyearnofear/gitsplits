import { NextResponse } from "next/server";
import axios from "axios";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per 5 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Missing owner or repo parameter" },
      { status: 400 }
    );
  }

  // Rate limiting
  const now = Date.now();
  const requestHistory = rateLimitMap.get(owner) || [];
  const recentRequests = requestHistory.filter(
    (time: number) => now - time < RATE_LIMIT_WINDOW
  );

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  rateLimitMap.set(owner, [...recentRequests, now]);

  try {
    // Fetch repo info
    const repoResponse = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    const repoData = repoResponse.data;

    // Fetch contributors
    const contributorsResponse = await axios.get(repoData.contributors_url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
      },
    });

    const contributors = contributorsResponse.data.map((contributor: any) => ({
      username: contributor.login,
      contributions: contributor.contributions,
      avatar_url: contributor.avatar_url,
    }));

    // Transform data
    const transformedData = {
      name: repoData.name,
      owner: repoData.owner.login,
      isFork: repoData.fork,
      originalRepo: repoData.fork
        ? {
            name: repoData.parent.name,
            owner: repoData.parent.owner.login,
          }
        : null,
      contributors: contributors,
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching repo info:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository information" },
      { status: 500 }
    );
  }
}
