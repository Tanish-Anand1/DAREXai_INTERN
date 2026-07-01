import { z } from "zod";

export const contactInput = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  company: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

export const opportunityInput = z.object({
  contactId: z.string().optional(),
  title: z.string().min(1).max(160),
  value: z.coerce.number().min(0).default(0),
  stage: z.enum(["new", "qualified", "proposal", "negotiation", "won", "lost"]).default("new"),
  lastContactAt: z.string().datetime().optional(),
});

export const messageIngestInput = z.object({
  contactId: z.string().optional(),
  type: z.enum(["whatsapp", "email", "call"]),
  direction: z.enum(["inbound", "outbound"]),
  body: z.string().min(1).max(5000),
  externalId: z.string().optional(),
});

export const taskToolInput = z.object({
  title: z.string().min(1).max(180),
  opportunityId: z.string().optional(),
  dueAt: z.string().datetime().optional(),
});

export const updateOpportunityToolInput = z.object({
  opportunityId: z.string().min(1),
  stage: z.enum(["new", "qualified", "proposal", "negotiation", "won", "lost"]).optional(),
  value: z.number().min(0).optional(),
  nextBestAction: z.string().max(1000).optional(),
});

export const sendWhatsappToolInput = z.object({
  contactId: z.string().min(1),
  body: z.string().min(1).max(1600),
});
