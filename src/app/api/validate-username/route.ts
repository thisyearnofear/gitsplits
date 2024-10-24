import { NextResponse } from "next/server";
import axios from "axios";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Missing username parameter" },
      { status: 400 }
    );
  }

  try {
    const response = await axios.get(`${GITHUB_API_URL}/users/${username}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
      },
    });

    if (response.status === 200) {
      return NextResponse.json({ isValid: true });
    }
  } catch (error) {
    console.error("Error validating username:", error);
    return NextResponse.json(
      { error: "Invalid GitHub username" },
      { status: 404 }
    );
  }
}
