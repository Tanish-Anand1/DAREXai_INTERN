import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { withApi, json } from "@/lib/api";
import { opportunityInput } from "@/lib/schemas";

export const GET = withApi(z.object({ stage: z.string().optional() }), async (_req, data, { db }) => {
  const opportunities = await db.opportunity.findMany({
    where: data.stage ? { stage: data.stage as never } : {},
    include: { contact: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return json({ opportunities });
}, { csrf: false });

export const POST = withApi(opportunityInput, async (_req, data, { auth, db }) => {
  const opportunity = await db.opportunity.create({
    data: {
      tenantId: auth.tenantId,
      title: data.title,
      value: data.value,
      stage: data.stage,
      contactId: data.contactId,
      lastContactAt: data.lastContactAt ? new Date(data.lastContactAt) : undefined,
    },
  });
  await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "crm.opportunity.create", target: opportunity.id });
  return json({ opportunity }, 201);
});
