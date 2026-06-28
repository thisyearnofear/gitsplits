import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/case/engine";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const state = getCase(params.id);
  if (!state) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  return NextResponse.json(state);
}
