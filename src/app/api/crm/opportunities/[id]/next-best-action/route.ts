import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { generateText } from "@/lib/ai";
import { withApi, json } from "@/lib/api";

export const POST = withApi(z.object({ regenerate: z.boolean().default(false) }), async (req, data, { auth, db }) => {
  const id = req.nextUrl.pathname.split("/").at(-2) ?? "";
  const opportunity = await db.opportunity.findFirst({ where: { id }, include: { contact: true } });
  if (!opportunity) return json({ error: "Not found" }, 404);
  if (opportunity.nextBestAction && !data.regenerate) return json({ nextBestAction: opportunity.nextBestAction, cached: true });
  const nextBestActionRaw = await generateText(
    `Create a concise next best action for this opportunity: ${JSON.stringify(opportunity)}. Write it as a single natural, friendly sentence explaining what to do next and why, as if written by a human manager. Do NOT use any asterisks (**), markdown, or prefix labels like "Next Best Action:" or "Why:". Example: "Send an email to Aarav to follow up on the enterprise automation pilot and address their budget questions."`
  );
  const nextBestAction = nextBestActionRaw
    .replace(/\*\*/g, "")
    .replace(/Next Best Action:\s*/i, "")
    .replace(/Why:\s*Based on the tenant CRM context and requested operation\.\s*/i, "")
    .replace(/Why:\s*/i, "")
    .trim();
  await db.opportunity.update({ where: { id }, data: { nextBestAction, nextBestActionAt: new Date() } });
  await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "ai.next_best_action", target: id });
  return json({ nextBestAction, cached: false });
});
