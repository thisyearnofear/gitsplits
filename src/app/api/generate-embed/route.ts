import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/services/api";
import { generateEmbedCode } from "@/lib/services/embed";

export async function POST(request: Request) {
  try {
    const { repoUrl, displayStyle } = await request.json();

    if (!repoUrl || !displayStyle) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const repoInfo = await getRepoInfo(repoUrl);
    const embedCode = generateEmbedCode(
      { owner: repoInfo.owner, name: repoInfo.name },
      displayStyle
    );

    return NextResponse.json({ repoInfo, embedCode });
  } catch (error) {
    console.error("Error generating embed code:", error); // Log the error
    return NextResponse.json(
      { error: "Failed to generate embed code" },
      { status: 500 }
    );
  }
}
