import { NextRequest, NextResponse } from "next/server";

/**
 * Mock WhatsApp API endpoint — used when USE_SANDBOX=true.
 * Accepts the same payload shape as the Meta Cloud API and always returns success.
 * Logs the message to console for demo visibility.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  console.log("[Mock WhatsApp] Message sent:", JSON.stringify(body, null, 2));

  // Simulate Meta Cloud API response shape
  return NextResponse.json({
    messaging_product: "whatsapp",
    contacts: [{ input: body.to ?? "unknown", wa_id: body.to ?? "unknown" }],
    messages: [{ id: `mock_${Date.now()}` }],
  });
}
