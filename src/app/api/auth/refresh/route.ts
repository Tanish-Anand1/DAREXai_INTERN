import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { accessCookieMaxAge, cookieNames, cookieOptions, refreshCookieMaxAge, rotateRefreshToken, signAccessToken } from "@/lib/tokens";
import { withApi } from "@/lib/api";

export const POST = withApi(
  z.object({}),
  async (req) => {
    const raw = req.cookies.get(cookieNames.refresh)?.value;
    if (!raw) {
      return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
    }

    const rotated = await rotateRefreshToken(raw);
    const user = await prisma.user.findFirstOrThrow({ where: { id: rotated.row.userId, tenantId: rotated.row.tenantId } });
    const access = await signAccessToken({ sub: user.id, tenantId: user.tenantId, email: user.email });
    await auditLog({ tenantId: user.tenantId, userId: user.id, action: "auth.refresh", target: "token" });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieNames.access, access, { ...cookieOptions, maxAge: accessCookieMaxAge });
    res.cookies.set(cookieNames.refresh, rotated.token, { ...cookieOptions, maxAge: refreshCookieMaxAge });
    return res;
  },
  { auth: false, csrf: false, rate: { key: "auth-refresh", limit: 30, windowMs: 60_000 } },
);
