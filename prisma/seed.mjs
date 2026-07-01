import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "demo@darex.ai";
  const tenant = await prisma.tenant.create({
    data: {
      name: "Darex AI Demo",
      businessName: "Darex AI Demo",
      onboardingJson: { source: "prisma-seed" },
      users: { create: { email, name: "Darex Demo User" } },
    },
    include: { users: true },
  });
  const user = tenant.users[0];

  const contact = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      name: "Aarav Mehta",
      email: "aarav.mehta@example.com",
      phone: "+15550100001",
      company: "Northstar Retail",
      notes: "Interested in automating inbound customer follow-up.",
    },
  });

  const opportunity = await prisma.opportunity.create({
    data: {
      tenantId: tenant.id,
      contactId: contact.id,
      title: "Enterprise automation pilot",
      value: 42000,
      stage: "qualified",
      lastContactAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.opportunity.create({
    data: {
      tenantId: tenant.id,
      contactId: contact.id,
      title: "Support inbox triage rollout",
      value: 18000,
      stage: "proposal",
      lastContactAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      opportunityId: opportunity.id,
      title: "Send pilot implementation plan",
      status: "pending",
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        tenantId: tenant.id,
        contactId: contact.id,
        type: "whatsapp",
        direction: "inbound",
        body: "Can you share pricing for the automation pilot this week?",
        sentiment: "neutral",
        intent: "purchase",
        summary: "Prospect asked for pilot pricing this week.",
        recommendedAction: "Send a pricing summary and schedule a discovery call",
        externalId: "seed-whatsapp-1",
      },
      {
        tenantId: tenant.id,
        contactId: contact.id,
        type: "email",
        direction: "inbound",
        body: "Thanks, the workflow demo looked great. Please follow up with the rollout timeline.",
        sentiment: "positive",
        intent: "followup",
        summary: "Prospect liked the workflow demo and wants a rollout timeline.",
        recommendedAction: "Share timeline and confirm implementation owner",
        externalId: "seed-email-1",
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      action: "demo.seed",
      resourceType: "tenant",
      resourceId: tenant.id,
      metadata: { email },
      ipAddress: "unknown",
      userAgent: "unknown",
    },
  });

  console.log(`Seeded tenant ${tenant.id} for ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
