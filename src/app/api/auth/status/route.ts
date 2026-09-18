import { NextResponse } from "next/server";
import { isAuthConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: isAuthConfigured() });
}
