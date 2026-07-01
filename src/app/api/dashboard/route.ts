import { z } from "zod";
import { withApi, json } from "@/lib/api";

export const GET = withApi(z.object({}), async (_req, _data, { db }) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [activeOpportunities, pipeline, pendingFollowups, recentActivity, aiAlerts, customerActivity] = await Promise.all([
    db.opportunity.count({ where: { stage: { notIn: ["won", "lost"] } } }),
    db.opportunity.aggregate({ _sum: { value: true }, where: { stage: { notIn: ["won", "lost"] } } }),
    db.task.count({ where: { status: "pending" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.opportunity.findMany({ where: { OR: [{ lastContactAt: null }, { lastContactAt: { lt: sevenDaysAgo } }], stage: { notIn: ["won", "lost"] } }, take: 10 }),
    db.message.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ]);
  console.log("dashboard raw Prisma result", {
    activeOpportunities,
    pipelineValue: Number(pipeline._sum.value ?? 0),
    pendingFollowups,
    recentActivity: recentActivity.length,
    aiAlerts: aiAlerts.length,
    customerActivity,
  });
  return json({
    activeOpportunities,
    pipelineValue: Number(pipeline._sum.value ?? 0),
    pendingFollowups,
    recentActivity,
    aiAlerts,
    customerActivity,
  });
}, { csrf: false });
