import { NextRequest, NextResponse } from "next/server";

// Middleware handles two responsibilities:
// 1. CORS headers for API routes
// 2. Route protection — redirect unauthenticated users away from /dashboard

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/security", "/api/webhooks", "/api/mock"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- CORS for API routes ---
  let response = NextResponse.next();
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:3000";
    if (origin && origin !== appOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Headers", "content-type,x-csrf-token");
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      if (req.method === "OPTIONS") {
        return new NextResponse(null, { headers: response.headers, status: 204 });
      }
    }
  }

  // --- Route protection for dashboard routes ---
  // Check for both NextAuth session token and our custom access token.
  // NextAuth sets a cookie like `next-auth.session-token` (or `__Secure-next-auth.session-token` on HTTPS).
  const hasNextAuthSession =
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token");
  const hasAccessToken = req.cookies.has("darex_access");

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
    if (!hasNextAuthSession && !hasAccessToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/onboarding/:path*"],
};
