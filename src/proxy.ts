import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// NOTE: this file only performs a *fast, best-effort* redirect for
// unauthenticated page/API requests so users are bounced to /login quickly.
// It must NOT be treated as the sole security boundary — the Edge
// proxy layer has historically been bypassable (see CVE-2025-29927), so
// every protected page (via the `(app)` layout) and every mutating API
// route under `/api/scripts` and `/api/tools` re-verifies the session
// independently on the Node.js runtime. This proxy is defense-in-depth,
// not the only line of defense.

const SESSION_COOKIE = "tm_session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/status", "/api/health"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authSecret = process.env.AUTH_SECRET;

  let authenticated = false;
  if (token && authSecret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(authSecret), { algorithms: ["HS256"] });
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
