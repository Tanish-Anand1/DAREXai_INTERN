import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { classifyMessage } from "@/lib/ai";
import { withApi, json } from "@/lib/api";
import { messageIngestInput } from "@/lib/schemas";

export const GET = withApi(z.object({}), async (_req, _data, { db }) => {
  const messages = await db.message.findMany({ include: { contact: true }, orderBy: { createdAt: "desc" }, take: 100 });
  console.log("inbox raw Prisma result", { messages: messages.length });
  return json({ messages });
}, { csrf: false });

export const POST = withApi(messageIngestInput, async (_req, data, { auth, db }) => {
  const ai = await classifyMessage(data.body);
  const message = await db.message.create({ data: { ...data, tenantId: auth.tenantId, ...ai } });
  await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "message.ingest", target: message.id, metadata: ai });
  return json({ message }, 201);
});
