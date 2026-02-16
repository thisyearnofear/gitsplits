/**
 * Agent API Route
 * 
 * HTTP interface to the GitSplits agent.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';

// Load env from agent directory
require('dotenv').config({ path: path.join(process.cwd(), 'agent', '.env') });

// Dynamic import to ensure env is loaded first
async function getProcessMessage() {
  const { processMessage } = await import('../../../../agent/dist/index');
  return processMessage;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, userId = 'web_user' } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text parameter' },
        { status: 400 }
      );
    }

    const processMessage = await getProcessMessage();

    // Process through agent
    const response = await processMessage({
      text: `@gitsplits ${text}`,
      author: userId,
      type: 'web',
    });

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'gitsplits-agent',
    timestamp: new Date().toISOString(),
  });
}
