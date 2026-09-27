import { NextResponse } from "next/server";
import { clearSessionCookie, destroyCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await destroyCurrentSession();
  } catch (error) {
    console.error("[auth/logout]", error);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
