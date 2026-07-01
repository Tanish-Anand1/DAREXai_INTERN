import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { withApi, json } from "@/lib/api";
import { contactInput } from "@/lib/schemas";

export const POST = withApi(
  z.object({
    businessName: z.string().min(2).max(120),
    firstContacts: z.array(contactInput).max(50).default([]),
  }),
  async (_req, data, { auth, db }) => {
    await db.tenant.update({
      where: { id: auth.tenantId },
      data: {
        businessName: data.businessName,
        onboardingJson: { importedContacts: data.firstContacts.length }
      }
    });

    if (data.firstContacts.length) {
      await db.contact.createMany({
        data: data.firstContacts.map((contact) => ({
          tenantId: auth.tenantId,
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
          company: contact.company || null,
          notes: contact.notes || null,
        })),
      });
    }
    await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: "tenant.onboarding", target: auth.tenantId, metadata: { contacts: data.firstContacts.length } });
    return json({ ok: true });
  },
  { rate: { key: "onboarding", limit: 20, windowMs: 60_000 } },
);
