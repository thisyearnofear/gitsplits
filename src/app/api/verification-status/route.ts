import { NextRequest, NextResponse } from 'next/server';
import { getVerificationStatus } from '@/lib/verification-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json(
      { success: false, error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    // Get verification status from Firebase
    const status = await getVerificationStatus(wallet);

    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch verification status' },
      { status: 500 }
    );
  }
}
