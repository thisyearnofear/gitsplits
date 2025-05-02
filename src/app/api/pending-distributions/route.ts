import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const github = searchParams.get('github');

  if (!github) {
    return NextResponse.json(
      { success: false, error: 'GitHub username is required' },
      { status: 400 }
    );
  }

  try {
    // For now, return a mock response since we don't have the worker running
    return NextResponse.json({
      success: true,
      distributions: []
    });

    // When the worker is running, uncomment this code:
    /*
    const response = await fetch(`${process.env.WORKER_API_URL}/api/pending-distributions?github=${github}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
    */
  } catch (error) {
    console.error('Error fetching pending distributions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending distributions' },
      { status: 500 }
    );
  }
}
