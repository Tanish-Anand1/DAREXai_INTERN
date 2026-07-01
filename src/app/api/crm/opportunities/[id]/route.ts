import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { withApi, json } from "@/lib/api";
import { opportunityInput } from "@/lib/schemas";

export const GET = withApi(z.object({}), async (req, _data, { auth, db }) => {
  const id = req.nextUrl.pathname.split("/").at(-1) ?? "";
  const opportunity = await db.opportunity.findFirst({ where: { id }, include: { contact: true, tasks: true } });
  if (!opportunity) return json({ error: "Not found" }, 404);
  
  const auditLogs = await db.auditLog.findMany({
    where: { resourceId: id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const messages = opportunity.contactId
    ? await db.message.findMany({
        where: { contactId: opportunity.contactId },
        orderBy: { createdAt: "desc" },
        take: 15,
      })
    : [];

  return json({ opportunity, auditLogs, messages });
}, { csrf: false });

export const PATCH = withApi(opportunityInput.partial(), async (req, data, { auth, db }) => {
  const id = req.nextUrl.pathname.split("/").at(-1) ?? "";
  const existing = await db.opportunity.findFirst({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);
  const opportunity = await db.opportunity.update({
    where: { id },
    data: {
      title: data.title,
      value: data.value,
      stage: data.stage,
      contactId: data.contactId,
      lastContactAt: data.lastContactAt ? new Date(data.lastContactAt) : undefined,
    },
  });
  await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "crm.opportunity.update", target: opportunity.id });
  return json({ opportunity });
});

export const DELETE = withApi(z.object({}), async (req, _data, { auth, db }) => {
  const id = req.nextUrl.pathname.split("/").at(-1) ?? "";
  const existing = await db.opportunity.findFirst({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);
  await db.opportunity.delete({ where: { id } });
  await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "crm.opportunity.delete", target: id });
  return json({ ok: true });
});
