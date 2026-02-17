import { NextRequest, NextResponse } from "next/server";
import { connect } from "near-api-js";

type ContributorStatus = {
  githubUsername: string;
  verified: boolean;
  walletAddress: string | null;
};

function getContractId(): string {
  return process.env.NEAR_CONTRACT_ID || "lhkor_marty.near";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contributors = Array.isArray(body?.contributors)
      ? (body.contributors as string[])
      : [];

    if (!contributors.length) {
      return NextResponse.json(
        { success: false, error: "contributors[] is required" },
        { status: 400 }
      );
    }

    const near = await connect({
      networkId: "mainnet",
      nodeUrl: "https://rpc.mainnet.near.org",
    });
    const account = await near.account(getContractId());

    const checks = await Promise.all(
      contributors.map(async (githubUsername): Promise<ContributorStatus> => {
        const verified = await account.viewFunction({
          contractId: getContractId(),
          methodName: "is_github_verified",
          args: { github_username: githubUsername },
        });

        const walletAddress = verified
          ? await account.viewFunction({
              contractId: getContractId(),
              methodName: "get_wallet_address",
              args: { github_username: githubUsername },
            })
          : null;

        return {
          githubUsername,
          verified: Boolean(verified),
          walletAddress: walletAddress ? String(walletAddress) : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      statuses: checks,
    });
  } catch (error) {
    console.error("Contributor status lookup failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check contributor status",
      },
      { status: 500 }
    );
  }
}
