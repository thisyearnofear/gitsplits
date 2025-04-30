import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if we have the required environment variables
    const contractId = process.env.NEXT_PUBLIC_contractId;
    
    if (!contractId) {
      return NextResponse.json(
        { 
          status: "warning", 
          message: "Missing required environment variables",
          missingVars: ["NEXT_PUBLIC_contractId"]
        },
        { status: 200 }
      );
    }
    
    // Return a success response
    return NextResponse.json(
      { 
        status: "ok", 
        timestamp: new Date().toISOString(),
        version: "0.1.0",
        service: "gitsplits-x-agent"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check error:", error);
    
    return NextResponse.json(
      { 
        status: "error", 
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
