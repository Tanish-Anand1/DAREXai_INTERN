import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { generateText, sendWhatsapp } from "@/lib/ai";
import { withApi } from "@/lib/api";

export const POST = withApi(
  z.object({ opportunityId: z.string().min(1) }),
  async (_req, data, { auth, db }) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const step = (name: string, payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: name, payload })}\n\n`));
          const opportunity = await db.opportunity.findFirst({ where: { id: data.opportunityId }, include: { contact: true } });
          if (!opportunity) throw new Error("Opportunity not found");
          step("loaded_opportunity", { id: opportunity.id });
          const rawOutput = await generateText(
            `Evaluate the qualification of this opportunity: ${JSON.stringify(opportunity)}.
             You must output exactly in this format:
             Score: [number between 0 and 100]
             Reasoning: [Write a very short, punchy, 2-sentence summary of the strengths and one main risk, in a natural human manager tone. Do NOT use any asterisks (**), markdown, or bullet points.]`
          );

          
          let score = 85;
          let reasoning = rawOutput;
          const trimmedOutput = rawOutput.trim();

          if (trimmedOutput.startsWith("{")) {
            try {
              const parsedJson = JSON.parse(trimmedOutput);
              score = typeof parsedJson.score === "number" ? parsedJson.score : Number(parsedJson.score || 85);
              reasoning = parsedJson.reasoning || parsedJson.reason || rawOutput;
            } catch (e) {
              console.warn("Failed to parse AI output as JSON, falling back to regex", e);
            }
          }

          if (!trimmedOutput.startsWith("{") || reasoning === rawOutput) {
            const scoreMatch = /Score:\s*(\d{1,3})/i.exec(rawOutput);
            score = scoreMatch ? Math.min(100, Math.max(0, Number(scoreMatch[1]))) : 85;

            const reasoningMatch = /Reasoning:\s*([\s\S]*)/i.exec(rawOutput);
            reasoning = (reasoningMatch ? reasoningMatch[1] : rawOutput)
              .replace(/\*\*/g, "")
              .replace(/Why:\s*/i, "")
              .trim();
          }

          await db.opportunity.update({ where: { id: opportunity.id }, data: { qualificationScore: score } });
          await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "automation.qualify.score", target: opportunity.id, metadata: { score, reasoning } });
          step("scored", { score, reasoning });
          if (score > 80 && opportunity.contactId) {
            const whatsapp = await sendWhatsapp(auth.tenantId, auth.userId, { contactId: opportunity.contactId, body: `Thanks for your interest. We can help with ${opportunity.title}. What is the best time to discuss next steps?` });
            step("sent_whatsapp", whatsapp);
            const task = await db.task.create({ data: { tenantId: auth.tenantId, opportunityId: opportunity.id, title: `Follow up on qualified lead: ${opportunity.title}` } });
            await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "automation.qualify.task", target: task.id });
            step("created_task", { id: task.id });
          }
          controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
        } catch (error) {
          console.error("Qualify lead stream failed", error);
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "Qualify lead stream failed" })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
  },
  { rate: { key: "qualify-lead", limit: 20, windowMs: 60_000 } },
);
