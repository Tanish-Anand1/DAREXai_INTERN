import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { accessCookieMaxAge, cookieNames, cookieOptions, createRefreshToken, refreshCookieMaxAge, signAccessToken } from "@/lib/tokens";
import { withApi } from "@/lib/api";

async function ensureDemoData(tenantId: string, userId: string) {
  const [contactCount, opportunityCount, messageCount] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    prisma.opportunity.count({ where: { tenantId } }),
    prisma.message.count({ where: { tenantId } }),
  ]);

  let contact = await prisma.contact.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } });
  if (!contactCount) {
    contact = await prisma.contact.create({
      data: {
        tenantId,
        name: "Aarav Mehta",
        email: "aarav.mehta@example.com",
        phone: "+919876543210",
        company: "Northstar Retail",
        notes: "Interested in automating inbound customer follow-up.",
      },
    });
  }

  if (!opportunityCount) {
    await prisma.opportunity.createMany({
      data: [
        {
          tenantId,
          contactId: contact?.id,
          title: "Enterprise automation pilot",
          value: 42000,
          stage: "qualified",
          lastContactAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        },
        {
          tenantId,
          contactId: contact?.id,
          title: "Support inbox triage rollout",
          value: 18000,
          stage: "proposal",
          lastContactAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ],
    });
  }

  const opportunity = await prisma.opportunity.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } });
  const taskCount = await prisma.task.count({ where: { tenantId } });
  if (!taskCount && opportunity) {
    await prisma.task.create({
      data: {
        tenantId,
        opportunityId: opportunity.id,
        title: "Send pilot implementation plan",
        status: "pending",
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    });
  }

  if (!messageCount) {
    await prisma.message.createMany({
      data: [
        {
          tenantId,
          contactId: contact?.id,
          type: "whatsapp",
          direction: "inbound",
          body: "Can you share pricing for the automation pilot this week?",
          sentiment: "neutral",
          intent: "purchase",
          summary: "Prospect asked for pilot pricing this week.",
          recommendedAction: "Send a pricing summary and schedule a discovery call",
          externalId: "demo-whatsapp-1",
        },
        {
          tenantId,
          contactId: contact?.id,
          type: "email",
          direction: "inbound",
          body: "Thanks, the workflow demo looked great. Please follow up with the rollout timeline.",
          sentiment: "positive",
          intent: "followup",
          summary: "Prospect liked the workflow demo and wants a rollout timeline.",
          recommendedAction: "Share timeline and confirm implementation owner",
          externalId: "demo-email-1",
        },
      ],
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "demo.seed.ensure",
      resourceType: "demo",
      resourceId: tenantId,
      metadata: { contactCount, opportunityCount, messageCount },
      ipAddress: "unknown",
      userAgent: "unknown",
    },
  });
}

export const POST = withApi(
  z.object({ businessName: z.string().min(2).max(120).optional() }),
  async (req, data) => {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "NextAuth session required" }, { status: 401 });
    }

    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      const tenant = await prisma.tenant.create({
        data: {
          name: data.businessName ?? `${session.user?.name ?? "New"} workspace`,
          businessName: data.businessName ?? `${session.user?.name ?? "New"} workspace`,
          users: { create: { email, name: session.user?.name, image: session.user?.image } },
        },
        include: { users: true },
      });
      user = tenant.users[0];
    }

    const tenantRecord = await prisma.tenant.findFirst({ where: { id: user.tenantId } });
    const needsOnboarding = !tenantRecord?.onboardingJson || Object.keys(tenantRecord.onboardingJson as object).length === 0;

    console.log("[Onboarding Debug] Raw DB Onboarding JSON:", tenantRecord?.onboardingJson);
    console.log("[Onboarding Debug] User Email:", email);
    console.log("[Onboarding Debug] Needs Onboarding?:", needsOnboarding);
    console.log("[Onboarding Debug] Redirect Decision:", needsOnboarding ? "Redirect to /onboarding" : "Redirect to /dashboard");

    

    const access = await signAccessToken({ sub: user.id, tenantId: user.tenantId, email: user.email });
    const refresh = await createRefreshToken(user.id, user.tenantId);
    await auditLog({ tenantId: user.tenantId, userId: user.id, action: "auth.exchange", target: "token" });

    const res = NextResponse.json({ ok: true, tenantId: user.tenantId, needsOnboarding });
    res.cookies.set(cookieNames.access, access, { ...cookieOptions, maxAge: accessCookieMaxAge });
    res.cookies.set(cookieNames.refresh, refresh.token, { ...cookieOptions, maxAge: refreshCookieMaxAge });
    return res;
  },
  { auth: false, csrf: false, rate: { key: "auth-exchange", limit: 10, windowMs: 60_000 } },
);
