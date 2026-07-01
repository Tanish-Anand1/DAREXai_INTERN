import "server-only";
import { randomBytes, randomUUID, createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export type AccessClaims = {
  sub: string;
  tenantId: string;
  email: string;
};

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const accessTtlSeconds = 15 * 60;
const refreshTtlMs = 7 * 24 * 60 * 60 * 1000;

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function signAccessToken(claims: AccessClaims) {
  return new SignJWT({ tenantId: claims.tenantId, email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${accessTtlSeconds}s`)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const result = await jwtVerify(token, accessSecret);
  return {
    sub: result.payload.sub ?? "",
    tenantId: String(result.payload.tenantId ?? ""),
    email: String(result.payload.email ?? ""),
  };
}

export async function createRefreshToken(userId: string, tenantId: string, familyId: string = randomUUID()) {
  const token = randomBytes(48).toString("base64url");
  const row = await prisma.refreshToken.create({
    data: {
      tenantId,
      userId,
      tokenHash: hashRefreshToken(token),
      familyId,
      expiresAt: new Date(Date.now() + refreshTtlMs),
    },
  });
  return { token, row };
}

export async function rotateRefreshToken(rawToken: string) {
  const tokenHash = hashRefreshToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw new Error("Refresh token not found");
  }

  if (existing.revokedAt || existing.replacedById || existing.expiresAt < new Date()) {
    await prisma.refreshToken.updateMany({
      where: { familyId: existing.familyId },
      data: { revokedAt: new Date(), reusedAt: new Date() },
    });
    throw new Error("Refresh token reuse detected");
  }

  const next = await createRefreshToken(existing.userId, existing.tenantId, existing.familyId);
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), replacedById: next.row.id },
  });

  return next;
}

export const cookieNames = {
  access: "darex_access",
  refresh: "darex_refresh",
  csrf: "darex_csrf",
};

export const cookieOptions = {
  httpOnly: true,
  secure: env.NEXTAUTH_URL.startsWith("https://"),
  sameSite: "strict" as const,
  path: "/",
};

export const accessCookieMaxAge = accessTtlSeconds;
export const refreshCookieMaxAge = refreshTtlMs / 1000;
