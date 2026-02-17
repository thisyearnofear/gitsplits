import { NextRequest, NextResponse } from "next/server";

type UxEventPayload = {
  name?: string;
  props?: Record<string, unknown>;
  timestamp?: string;
  path?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UxEventPayload;
    if (!body?.name) {
      return NextResponse.json(
        { success: false, error: "Event name is required" },
        { status: 400 }
      );
    }

    const event = {
      name: body.name,
      props: body.props || {},
      path: body.path || "",
      timestamp: body.timestamp || new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "",
    };

    console.log("[UX_EVENT]", JSON.stringify(event));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to record UX event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record event" },
      { status: 500 }
    );
  }
}

