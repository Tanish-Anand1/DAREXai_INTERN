import { NextResponse } from "next/server";
import { cookieNames } from "@/lib/tokens";
import { newCsrfToken } from "@/lib/api";
import { env } from "@/lib/env";

export function GET() {
  const token = newCsrfToken();
  const res = NextResponse.json({ csrfToken: token });
  res.cookies.set(cookieNames.csrf, token, {
    httpOnly: false,
    secure: env.NEXTAUTH_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
  });
  return res;
}
