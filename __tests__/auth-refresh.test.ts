import { beforeEach, describe, expect, it, vi } from "vitest";

const rows: Array<any> = [];

vi.mock("@/lib/prisma", () => ({
  prisma: {
    refreshToken: {
      create: vi.fn(async ({ data }) => {
        const row = { id: `rt-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }) => rows.find((row) => row.tokenHash === where.tokenHash) ?? null),
      update: vi.fn(async ({ where, data }) => {
        const row = rows.find((item) => item.id === where.id);
        Object.assign(row, data);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        for (const row of rows.filter((item) => item.familyId === where.familyId)) Object.assign(row, data);
        return { count: rows.length };
      }),
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: { JWT_ACCESS_SECRET: "test-access-secret-32-bytes", DATABASE_URL: "postgresql://test", NEXTAUTH_URL: "http://localhost:3000", NEXTAUTH_SECRET: "test-secret", APP_ORIGIN: "http://localhost:3000" },
}));

describe("refresh token rotation", async () => {
  const { createRefreshToken, rotateRefreshToken } = await import("@/lib/tokens");

  beforeEach(() => rows.splice(0, rows.length));

  it("rotates a refresh token and detects reuse of the old token", async () => {
    const initial = await createRefreshToken("user-1", "tenant-1", "family-1");
    const next = await rotateRefreshToken(initial.token);
    expect(next.token).not.toEqual(initial.token);
    await expect(rotateRefreshToken(initial.token)).rejects.toThrow("Refresh token reuse detected");
    expect(rows.every((row) => row.revokedAt)).toBe(true);
  });
});
