import { tenantScopedPrisma } from "@/lib/prisma";

type AuditInput = {
  tenantId: string;
  userId?: string;
  action: string;
  target?: string;
  resourceType?: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function auditLog(input: AuditInput) {
  const db = tenantScopedPrisma(input.tenantId);
  
  
  
  
  let rType = input.resourceType;
  if (!rType) {
    const parts = input.action.split(".");
    if (parts.length >= 2) {
      rType = parts[parts.length - 2];
    } else {
      rType = "system";
    }
  }

  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId || "system",
      action: input.action,
      resourceType: rType,
      resourceId: input.resourceId || input.target || null,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress || input.ip || "unknown",
      userAgent: input.userAgent || "unknown",
    },
  });
}
