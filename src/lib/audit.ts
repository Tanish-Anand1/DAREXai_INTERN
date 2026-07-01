import { tenantScopedPrisma } from "@/lib/prisma";

type AuditInput = {
  tenantId: string;
  userId?: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
  ip?: string;
};

export async function auditLog(input: AuditInput) {
  const db = tenantScopedPrisma(input.tenantId);
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      target: input.target,
      metadata: input.metadata ?? {},
      ip: input.ip,
    },
  });
}
