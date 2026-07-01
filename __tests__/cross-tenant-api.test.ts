import { describe, expect, it } from "vitest";
import { assertTenantWhere } from "@/lib/prisma";

describe("cross-tenant penetration check", () => {
  it("rejects a direct API-style attempt to force another tenantId in the contact filter", () => {
    const attackerTenant = "tenant-a";
    const requestedVictimFilter = { id: "contact-from-tenant-b", tenantId: "tenant-b" };
    expect(() => assertTenantWhere(requestedVictimFilter, attackerTenant)).toThrow("Cross-tenant query rejected");
  });
});
