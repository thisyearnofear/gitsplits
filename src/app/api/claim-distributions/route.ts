import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, githubUsername } = body;

    if (!walletAddress || !githubUsername) {
      return NextResponse.json(
        { success: false, error: 'Wallet address and GitHub username are required' },
        { status: 400 }
      );
    }

    // For now, return a mock response since we don't have the worker running
    return NextResponse.json({
      success: true,
      message: 'Distributions claimed successfully'
    });

    // When the worker is running, uncomment this code:
    /*
    const response = await fetch(`${process.env.WORKER_API_URL}/api/claim-distributions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        githubUsername
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
    */
  } catch (error) {
    console.error('Error claiming distributions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to claim distributions' },
      { status: 500 }
    );
  }
}
