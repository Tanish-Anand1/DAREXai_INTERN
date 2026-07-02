"use client";

import Link from "next/link";
import { Bot, BarChart3, Inbox, Workflow, Zap, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Operations Agent",
    desc: "Natural-language agent with 5 tool integrations, streaming responses, and persistent conversation history.",
    color: "#8b5cf6",
  },
  {
    icon: BarChart3,
    title: "Intelligent CRM",
    desc: "Contact management, opportunity pipeline with AI qualification scoring and next-best-action recommendations.",
    color: "#6366f1",
  },
  {
    icon: Inbox,
    title: "Unified Inbox",
    desc: "WhatsApp, Email & Call logs with AI-powered sentiment analysis, intent detection, and smart routing.",
    color: "#06b6d4",
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    desc: "Lead qualification chains with real-time streaming execution, WhatsApp follow-ups, and audit logging.",
    color: "#22c55e",
  },
];

const TECH_BADGES = [
  "Next.js 14", "TypeScript", "Prisma", "PostgreSQL",
  "Gemini AI", "SSE Streaming", "OAuth 2.0", "Multi-Tenant",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function LandingPage() {
  return (
    <main className="landing-bg grid-pattern min-h-screen">
      {}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-20">
        {}
        <div
          className="absolute top-20 left-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-10 right-1/4 w-56 h-56 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 70%)" }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8"
            style={{
              background: "rgba(139, 92, 246, 0.08)",
              borderColor: "rgba(139, 92, 246, 0.2)",
            }}>
            <Sparkles size={13} style={{ color: "var(--accent-primary)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--accent-primary)" }}>
              AI-Powered Business Operations
            </span>
          </div>

          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-gradient)", boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}>
              <Zap size={24} color="#fff" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
            <span className="gradient-text">Darex AI</span>
            <br />
            <span style={{ color: "var(--text-primary)" }}>Operations Console</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Multi-tenant platform that unifies CRM, communications, and workflow
            automation — all powered by conversational AI.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4">
            <Link href="/login" className="btn btn-primary text-sm px-8 py-3 gap-2 font-semibold">
              Get Started <ArrowRight size={16} />
            </Link>
            <a href="#features" className="btn btn-secondary text-sm px-6 py-3">
              See Features
            </a>
          </div>
        </motion.div>
      </section>

      {/* ────────── FEATURES ────────── */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-14"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Enterprise Capabilities
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="text-sm max-w-lg mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Every feature is wired end-to-end with real database operations, AI integration, and audit logging.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-5 sm:grid-cols-2"
        >
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} variants={fadeUp} custom={i + 2} className="card-glow p-6">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl mb-4"
                style={{
                  background: `${f.color}12`,
                  color: f.color,
                }}
              >
                <f.icon size={20} />
              </div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                {f.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ────────── SECURITY & TECH ────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="card-glass p-8 text-center"
        >
          <motion.div variants={fadeUp} custom={0} className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck size={18} style={{ color: "var(--accent-primary)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Enterprise-Grade Security
            </h3>
          </motion.div>
          <motion.p variants={fadeUp} custom={1} className="text-xs mb-6 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
            Server-side auth gates, tenant-scoped data isolation, CSRF protection, short-lived JWT rotation,
            and httpOnly secure cookies — every route is protected by design.
          </motion.p>
          <motion.div variants={fadeUp} custom={2} className="flex flex-wrap items-center justify-center gap-2">
            {TECH_BADGES.map((b) => (
              <span key={b} className="badge badge-accent text-[11px]">{b}</span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ────────── FOOTER ────────── */}
      <footer className="border-t py-8 px-6 text-center" style={{ borderColor: "var(--border-default)" }}>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Darex AI Operations Console — Built with Next.js 14, Prisma, and Gemini AI
        </p>
      </footer>
    </main>
  );
}
