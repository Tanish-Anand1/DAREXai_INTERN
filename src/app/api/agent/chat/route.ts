import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { businessContext, runAgentTool, generateLocalSmartResponse, processLocalAgentRouting } from "@/lib/ai";
import { withApi, json } from "@/lib/api";
import { GoogleGenerativeAI, SchemaType, Tool } from "@google/generative-ai";
import { env } from "@/lib/env";

const chatInput = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(4000),
});


export const GET = withApi(
  z.object({ conversationId: z.string().optional() }),
  async (req, data, { auth, db }) => {
    
    if (data.conversationId) {
      const messages = await db.chatMessage.findMany({
        where: { conversationId: data.conversationId },
        orderBy: { createdAt: "asc" },
      });
      return json({ messages });
    }

    
    const conversations = await db.chatConversation.findMany({
      where: { userId: auth.userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return json({ conversations });
  },
  { csrf: false }
);


const agentTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "search_contacts",
        description: "Search customer contacts by name or email query in the database.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: "Search query string (name or email)" }
          },
          required: ["query"]
        }
      },
      {
        name: "create_task",
        description: "Create a reminder task or follow-up.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: "Title/details of the task" },
            opportunityId: { type: SchemaType.STRING, description: "Optional opportunity database ID" },
            dueAt: { type: SchemaType.STRING, description: "Optional ISO datetime string for when the task is due" }
          },
          required: ["title"]
        }
      },
      {
        name: "update_opportunity",
        description: "Update CRM opportunity stage, value, or next best action.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            opportunityId: { type: SchemaType.STRING, description: "The database ID of the opportunity to update" },
            stage: { type: SchemaType.STRING, description: "Pipeline stage (new, qualified, proposal, negotiation, won, lost)" },
            value: { type: SchemaType.NUMBER, description: "Financial value of the opportunity" },
            nextBestAction: { type: SchemaType.STRING, description: "AI-recommended next best action string" }
          },
          required: ["opportunityId"]
        }
      },
      {
        name: "send_whatsapp",
        description: "Send an outbound WhatsApp message to a contact.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            contactId: { type: SchemaType.STRING, description: "The database ID of the contact to message" },
            body: { type: SchemaType.STRING, description: "Message text body content" }
          },
          required: ["contactId", "body"]
        }
      },
      {
        name: "fetch_business_metrics",
        description: "Fetch live dashboard aggregate metrics and KPIs (active opportunities, pending tasks, pipeline value).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}
        }
      }
    ]
  }
];

async function streamText(text: string, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  const chunks = text.match(/[\s\S]{1,6}/g) ?? [text];
  for (const chunk of chunks) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

export const POST = withApi(
  chatInput,
  async (_req, data, { auth, db }) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          
          const conversation = data.conversationId
            ? await db.chatConversation.findFirst({ where: { id: data.conversationId } })
            : await db.chatConversation.create({
                data: {
                  tenantId: auth.tenantId,
                  userId: auth.userId,
                  title: data.message.slice(0, 80),
                },
              });

          if (!conversation) {
            throw new Error("Conversation not found");
          }

          
          await db.chatMessage.create({
            data: {
              tenantId: auth.tenantId,
              conversationId: conversation.id,
              role: "user",
              content: data.message,
            },
          });

          let finalResponse = "";
          let lastToolName: string | undefined;
          let lastToolPayload: any;

          
          if (!env.GEMINI_API_KEY) {
            finalResponse = await processLocalAgentRouting(auth.tenantId, auth.userId, data.message);
            await db.chatMessage.create({
              data: {
                tenantId: auth.tenantId,
                conversationId: conversation.id,
                role: "assistant",
                content: finalResponse,
              },
            });
            await streamText(finalResponse, controller, encoder);
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
            return;
          }

          
          const pastMessages = await db.chatMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "asc" },
            take: 20,
          });

          
          const history = pastMessages.slice(0, -1).map((m: any) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          }));

          
          const contextFacts = await businessContext(auth.tenantId);

          const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
          
          
          let response: any = null;
          let chatSession: any = null;

          for (const modelName of ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]) {
            try {
              const modelInstance = genAI.getGenerativeModel({
                model: modelName,
                tools: agentTools,
                systemInstruction: `You are an AI business operations agent. You have access to backend tools. If you need to perform an action, search contacts, send a message, or fetch metrics, you MUST call the appropriate function tool. Do NOT output any text explanation or "Why" reasoning in the same turn that you trigger a function call. Only include your "Why: [reasoning]" explanation in your final text response after the tool result is returned. Context Facts: ${JSON.stringify(contextFacts)}`,
              });
              chatSession = modelInstance.startChat({ history });
              response = await chatSession.sendMessage(data.message);
              break; 
            } catch (e) {
              console.warn(`Failed to initialize or send message with ${modelName}, trying next...`, e);
            }
          }

          if (!response || !chatSession) {
            console.warn("All Gemini models failed to respond. Falling back to local smart engine.");
            finalResponse = await processLocalAgentRouting(auth.tenantId, auth.userId, data.message);
            
            
            await db.chatMessage.create({
              data: {
                tenantId: auth.tenantId,
                conversationId: conversation.id,
                role: "assistant",
                content: finalResponse,
              },
            });

            await db.chatConversation.update({
              where: { id: conversation.id },
              data: { updatedAt: new Date() },
            });

            await auditLog({
              tenantId: auth.tenantId,
              userId: auth.userId,
              action: "agent.response",
              target: conversation.id,
              metadata: { fallback: true },
            });

            
            await streamText(finalResponse, controller, encoder);
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
            return;
          }

          let functionCalls = response.response.functionCalls;

          
          if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            lastToolName = call.name;
            lastToolPayload = call.args;

            
            controller.enqueue(
              encoder.encode(`event: tool\ndata: ${JSON.stringify({ name: call.name, args: call.args })}\n\n`)
            );

            
            let toolResult: any;
            try {
              toolResult = await runAgentTool(auth.tenantId, auth.userId, call.name, call.args);
            } catch (err) {
              console.error(`Tool execution failed for ${call.name}:`, err);
              toolResult = { error: err instanceof Error ? err.message : "Tool failed" };
            }

            
            controller.enqueue(
              encoder.encode(`event: tool_result\ndata: ${JSON.stringify({ name: call.name, result: toolResult })}\n\n`)
            );

            
            const followUp = await chatSession.sendMessage([
              {
                functionResponse: {
                  name: call.name,
                  response: { result: toolResult },
                },
              },
            ]);

            finalResponse = followUp.response.text();
          } else {
            finalResponse = response.response.text();
          }

          
          await db.chatMessage.create({
            data: {
              tenantId: auth.tenantId,
              conversationId: conversation.id,
              role: "assistant",
              content: finalResponse,
              toolName: lastToolName,
              toolPayload: lastToolPayload ? JSON.parse(JSON.stringify(lastToolPayload)) : undefined,
            },
          });

          await db.chatConversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          await auditLog({
            tenantId: auth.tenantId,
            userId: auth.userId,
            action: "agent.response",
            target: conversation.id,
            metadata: { tool: lastToolName },
          });

          
          await streamText(finalResponse, controller, encoder);
          controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
        } catch (error) {
          console.error("Agent stream failed", error);
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "Agent stream failed" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    });
  },
  { rate: { key: "agent-chat", limit: 30, windowMs: 60_000 } }
);
