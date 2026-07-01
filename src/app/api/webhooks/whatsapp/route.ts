import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyMessage, generateText, sendWhatsapp } from "@/lib/ai";
import { env } from "@/lib/env";

function validSignature(raw: string, header: string | null) {
  // If no app secret is set, we bypass signature verification in local development sandbox mode
  if (!env.META_APP_SECRET) return true;
  if (!header?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", env.META_APP_SECRET).update(raw).digest("hex")}`;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}

export function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === env.META_VERIFY_TOKEN && challenge) {
    return new Response(challenge);
  }
  return NextResponse.json({ error: "Invalid verification" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let tenantId = "";
  let contactId: string | null = null;
  let body = "";
  let externalId = "";

  // 1. Detect if it is the official Meta Cloud API nested structure
  if (payload.object === "whatsapp_business_account" && payload.entry?.[0]?.changes?.[0]?.value) {
    const value = payload.entry[0].changes[0].value;
    const message = value.messages?.[0];

    if (!message) {
      // Sometimes Meta sends status update webhooks (sent/delivered/read) which we can acknowledge with 200
      return NextResponse.json({ ok: true, type: "status_update" });
    }

    body = message.text?.body || "";
    externalId = message.id || "";
    const from = message.from; // e.g. "15550100001"

    if (!body || !from) {
      return NextResponse.json({ error: "Missing message body or sender info" }, { status: 400 });
    }

    // Resolve tenantId and contactId by looking up the phone number in the DB
    // Format could be raw or prefixed; we do a flexible contains search
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: from },
          { phone: `+${from}` },
          { phone: { contains: from } }
        ]
      }
    });

    if (!contact) {
      // In production, you might auto-create a contact under a default tenant or log it
      console.warn(`[Webhook] Message received from unregistered number: ${from}`);
      return NextResponse.json({ error: "Sender phone number not found in CRM contacts" }, { status: 404 });
    }

    tenantId = contact.tenantId;
    contactId = contact.id;
  }
  // 2. Fallback to flat payload format (used by our sandbox simulator)
  else {
    const sender = payload.from || "";
    body = payload.message || payload.body || "";
    externalId = payload.externalId || "";

    if (sender) {
      const contact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: sender },
            { phone: `+${sender}` },
            { phone: { contains: sender } }
          ]
        }
      });
      if (contact) {
        tenantId = contact.tenantId;
        contactId = contact.id;
      }
    }

    if (!tenantId) tenantId = payload.tenantId || "";
    if (!contactId) contactId = payload.contactId || null;

    if (!tenantId || !body) {
      return NextResponse.json({ error: "Missing tenantId or body" }, { status: 400 });
    }
  }

  // Classify message sentiment, intent, and recommended action
  const ai = await classifyMessage(body);

  // Write to tenant-scoped database
  const message = await prisma.message.create({
    data: {
      tenantId,
      contactId,
      type: "whatsapp",
      direction: "inbound",
      body,
      externalId,
      ...ai,
    },
  });

  // Record audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: "system",
      action: "webhook.whatsapp.inbound",
      resourceType: "message",
      resourceId: message.id,
      metadata: { externalId, sender: contactId ? "CRM Contact" : "Flat Payload" },
      ipAddress: "unknown",
      userAgent: "unknown",
    },
  });

  // Automatically trigger outbound AI response back through the sandbox mock layer
  if (contactId) {
    try {
      console.log(`[WhatsApp Outbound] Webhook received message from registered contact. Contact ID: ${contactId}`);
      console.log(`[WhatsApp Outbound] Step 1: Gemini call invoked with message: "${body}"`);
      const responseText = await generateText(
        `Draft a short, polite, one-sentence response to this customer message: "${body}". Keep it extremely concise.`
      );
      console.log(`[WhatsApp Outbound] Step 2: Gemini response received: "${responseText}"`);
      
      const firstUser = await prisma.user.findFirst({ where: { tenantId } });
      const userId = firstUser?.id ?? "system";
      
      console.log(`[WhatsApp Outbound] Step 3: sendWhatsapp function called for tenant: ${tenantId}, user: ${userId}`);
      await sendWhatsapp(tenantId, userId, { contactId, body: responseText });
    } catch (replyErr) {
      console.error("[WhatsApp Outbound] Webhook outbound flow failed:", replyErr);
    }
  }

  return NextResponse.json({ ok: true, messageId: message.id });
}
