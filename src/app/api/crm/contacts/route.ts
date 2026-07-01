import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { withApi, json } from "@/lib/api";
import { contactInput } from "@/lib/schemas";

export const GET = withApi(z.object({ q: z.string().optional() }), async (_req, data, { db }) => {
  const contacts = await db.contact.findMany({
    where: data.q ? { name: { contains: data.q, mode: "insensitive" } } : {},
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return json({ contacts });
}, { csrf: false });

export const POST = withApi(contactInput, async (_req, data, { auth, db }) => {
  const contact = await db.contact.create({ data: { ...data, tenantId: auth.tenantId, email: data.email || undefined } });
  await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "crm.contact.create", target: contact.id });
  return json({ contact }, 201);
});
