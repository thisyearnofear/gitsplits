import { NextResponse } from "next/server";
import { getRepoInfo } from "@/utils/api";
import { generateEmbedCode } from "@/utils/embed";

export async function POST(request: Request) {
  const { repoUrl, contractAddress, displayStyle } = await request.json();

  try {
    const repoInfo = await getRepoInfo(repoUrl);
    const embedCode = generateEmbedCode(
      { owner: repoInfo.owner, name: repoInfo.name },
      contractAddress,
      displayStyle
    );
    return NextResponse.json({ repoInfo, embedCode });
  } catch (error) {
    console.error("Error generating embed code:", error);
    return NextResponse.json(
      { error: "Failed to generate embed code" },
      { status: 500 }
    );
  }
}
