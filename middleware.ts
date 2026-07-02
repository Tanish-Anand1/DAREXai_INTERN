import { NextRequest, NextResponse } from "next/server";





const PUBLIC_PATHS = ["/login", "/api/auth", "/api/security", "/api/webhooks", "/api/mock"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  
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
