import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, z } from "zod";
import { cookieNames, verifyAccessToken } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import { tenantScopedPrisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export type ApiContext = {
  auth: {
    userId: string;
    tenantId: string;
    email: string;
  };
  db: ReturnType<typeof tenantScopedPrisma>;
};

type Handler<T> = (req: NextRequest, data: T, context: ApiContext) => Promise<Response> | Response;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function newCsrfToken() {
  return randomBytes(32).toString("base64url");
}

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

function enforceOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return origin === env.APP_ORIGIN;
}

function enforceCsrf(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return true;
  }
  const header = req.headers.get("x-csrf-token");
  const cookie = req.cookies.get(cookieNames.csrf)?.value;
  return Boolean(header && cookie && header === cookie);
}

export async function requireAuth(req: NextRequest) {
  const token = req.cookies.get(cookieNames.access)?.value;
  if (!token) {
    throw new Error("Missing access token");
  }
  const claims = await verifyAccessToken(token);
  if (!claims.sub || !claims.tenantId) {
    throw new Error("Invalid access token");
  }
  return { userId: claims.sub, tenantId: claims.tenantId, email: claims.email };
}

export function withApi<T extends ZodSchema>(
  schema: T,
  handler: Handler<z.infer<T>>,
  options: { csrf?: boolean; rate?: { key: string; limit: number; windowMs: number }; auth?: boolean } = {},
) {
  return async (req: NextRequest) => {
    if (!enforceOrigin(req)) {
      return json({ error: "Origin rejected" }, 403);
    }

    if (options.csrf !== false && !enforceCsrf(req)) {
      return json({ error: "CSRF check failed" }, 403);
    }

    if (options.rate) {
      const rate = checkRateLimit(`${options.rate.key}:${getIp(req)}`, options.rate.limit, options.rate.windowMs);
      if (!rate.ok) {
        return json({ error: "Rate limit exceeded" }, 429);
      }
    }

    let body: unknown = {};
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.json().catch(() => ({}));
    } else {
      body = Object.fromEntries(req.nextUrl.searchParams);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Validation failed", issues: parsed.error.issues.slice(0, 1) }, 400);
    }

    try {
      const auth = options.auth === false ? { userId: "", tenantId: "", email: "" } : await requireAuth(req);
      const db = auth.tenantId ? tenantScopedPrisma(auth.tenantId) : tenantScopedPrisma("system");
      return handler(req, parsed.data, { auth, db });
    } catch (error) {
      console.error(`API ${req.method} ${req.nextUrl.pathname} failed`, error);
      return json({ error: error instanceof Error ? error.message : "Unauthorized" }, 401);
    }
  };
}
