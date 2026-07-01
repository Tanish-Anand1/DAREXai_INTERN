import { z } from "zod";
import { sendWhatsapp } from "@/lib/ai";
import { withApi, json } from "@/lib/api";

const replyInput = z.object({
  contactId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export const POST = withApi(
  replyInput,
  async (_req, data, { auth }) => {
    const result = await sendWhatsapp(auth.tenantId, auth.userId, {
      contactId: data.contactId,
      body: data.body,
    });
    return json({ ok: result.ok, status: result.status });
  }
);
