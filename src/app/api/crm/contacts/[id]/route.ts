import { z } from "zod";
import { withApi, json } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { contactInput } from "@/lib/schemas";

export const GET = withApi(z.object({}), async (req, _data, { db }) => {
  const id = req.nextUrl.pathname.split("/").at(-1) ?? "";
  const contact = await db.contact.findFirst({ where: { id } });
  if (!contact) return json({ error: "Not found" }, 404);
  return json({ contact });
}, { csrf: false });

export const PATCH = withApi(contactInput.partial(), async (req, data, { auth, db }) => {
  const id = req.nextUrl.pathname.split("/").at(-1) ?? "";
  const existing = await db.contact.findFirst({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);
  const contact = await db.contact.update({ where: { id }, data: { ...data, email: data.email || undefined } });
  await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "crm.contact.update", target: contact.id });
  return json({ contact });
});

export const DELETE = withApi(z.object({}), async (req, _data, { auth, db }) => {
  const id = req.nextUrl.pathname.split("/").at(-1) ?? "";
  const existing = await db.contact.findFirst({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);
  await db.contact.delete({ where: { id } });
  await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "crm.contact.delete", target: id });
  return json({ ok: true });
});
