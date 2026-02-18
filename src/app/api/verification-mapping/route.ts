import { NextRequest, NextResponse } from "next/server";
import { connect } from "near-api-js";

type VerificationEntry = {
  github_username: string;
  wallet_address: string;
  x_username?: string | null;
};

function getContractId(): string {
  return process.env.NEAR_CONTRACT_ID || "lhkor_marty.near";
}

async function getContractAccount() {
  const near = await connect({
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.near.org",
  });
  return near.account(getContractId());
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get("q") || "").trim();
    const repo = (searchParams.get("repo") || "").trim();
    const cursor = (searchParams.get("cursor") || "").trim();
    const offset = Number(searchParams.get("offset") || "0");
    const limit = Math.min(Number(searchParams.get("limit") || "25"), 100);
    const account = await getContractAccount();

    if (repo) {
      const repoUrl = repo.startsWith("github.com/") ? repo : `github.com/${repo}`;
      const status = await account.viewFunction({
        contractId: getContractId(),
        methodName: "get_repo_verification_status",
        args: { repo_url: repoUrl },
      });
      return NextResponse.json({
        success: true,
        source: "near_contract",
        repo: repoUrl,
        status,
      });
    }

    if (q) {
      // Search by github username first, then by wallet address.
      const githubUsername = q.replace(/^@/, "");
      const verified = await account.viewFunction({
        contractId: getContractId(),
        methodName: "is_github_verified",
        args: { github_username: githubUsername },
      });

      if (verified) {
        const walletAddress = await account.viewFunction({
          contractId: getContractId(),
          methodName: "get_wallet_address",
          args: { github_username: githubUsername },
        });
        return NextResponse.json({
          success: true,
          source: "near_contract",
          query: q,
          total: 1,
          entries: [
            {
              github_username: githubUsername,
              wallet_address: String(walletAddress),
            },
          ] as VerificationEntry[],
        });
      }

      if (/\.near$|\.testnet$/i.test(q)) {
        const github = await account.viewFunction({
          contractId: getContractId(),
          methodName: "get_github_by_wallet",
          args: { wallet_address: q },
        });
        if (github) {
          return NextResponse.json({
            success: true,
            source: "near_contract",
            query: q,
            total: 1,
            entries: [
              {
                github_username: String(github),
                wallet_address: q,
              },
            ] as VerificationEntry[],
          });
        }
      }

      return NextResponse.json({
        success: true,
        source: "near_contract",
        query: q,
        total: 0,
        entries: [] as VerificationEntry[],
      });
    }

    // Explorer mode: stable cursor pagination (preferred).
    const cursorPage = await account.viewFunction({
      contractId: getContractId(),
      methodName: "get_verified_wallets_cursor",
      args: {
        start_after: cursor || null,
        limit: Number.isFinite(limit) ? Math.max(limit, 1) : 25,
      },
    });

    return NextResponse.json({
      success: true,
      source: "near_contract",
      total: Number(cursorPage?.total || 0),
      cursor: cursor || null,
      nextCursor: cursorPage?.next_cursor || null,
      offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
      limit: Number.isFinite(limit) ? Math.max(limit, 1) : 25,
      entries: Array.isArray(cursorPage?.entries)
        ? (cursorPage.entries as VerificationEntry[])
        : [],
    });
  } catch (error) {
    console.error("Verification mapping lookup failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load verification mapping",
        hint:
          "If pagination methods are missing, redeploy the NEAR contract with verification explorer views.",
      },
      { status: 500 }
    );
  }
}
