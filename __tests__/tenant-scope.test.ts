import { describe, expect, it } from "vitest";
import { assertTenantWhere } from "@/lib/prisma";

describe("tenant scope enforcement", () => {
  it("throws when an explicit cross-tenant query is attempted", () => {
    expect(() => assertTenantWhere({ tenantId: "tenant-b" }, "tenant-a")).toThrow("Cross-tenant query rejected");
  });

  it("allows the current tenant or an injected tenant-less filter", () => {
    expect(() => assertTenantWhere({ tenantId: "tenant-a" }, "tenant-a")).not.toThrow();
    expect(() => assertTenantWhere({ name: "Acme" }, "tenant-a")).not.toThrow();
  });
});
