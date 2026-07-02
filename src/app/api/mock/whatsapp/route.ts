import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  console.log("[Mock WhatsApp] Message sent:", JSON.stringify(body, null, 2));

  
  return NextResponse.json({
    messaging_product: "whatsapp",
    contacts: [{ input: body.to ?? "unknown", wa_id: body.to ?? "unknown" }],
    messages: [{ id: `mock_${Date.now()}` }],
  });
}
