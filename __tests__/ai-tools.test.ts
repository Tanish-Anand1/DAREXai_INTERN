import { describe, expect, it, vi } from "vitest";

const createTask = vi.fn(async ({ data }) => ({ id: "task-1", ...data }));

vi.mock("@/lib/prisma", () => ({
  tenantScopedPrisma: vi.fn(() => ({
    task: { create: createTask },
  })),
}));

vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: { GEMINI_API_KEY: "", USE_SANDBOX: "true", WHATSAPP_SANDBOX_URL: "http://localhost/mock" },
}));

describe("AI tool calls", async () => {
  const { runAgentTool } = await import("@/lib/ai");

  it("validates and invokes create_task", async () => {
    const result = await runAgentTool("tenant-1", "user-1", "create_task", { title: "Follow up" });
    expect(result).toMatchObject({ id: "task-1", tenantId: "tenant-1", title: "Follow up" });
    expect(createTask).toHaveBeenCalled();
  });
});
