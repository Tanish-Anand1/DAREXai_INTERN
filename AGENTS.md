# AGENTS.md — Darex AI Operations Platform

## Project Context
Multi-tenant AI Business Operations Platform. Internship evaluation project — judged on
engineering quality, architecture, security, AI integration, and problem-solving, NOT feature
count. Every architectural decision must be defensible verbally by the human in a live walkthrough
— do not implement anything you (the agent) can't explain in plain terms in a code comment or
DECISIONS.md entry.

## Stack — do not deviate without explicit human approval
- Next.js 14 App Router, TypeScript, Tailwind, Zustand + React Query
- PostgreSQL + Prisma (no raw SQL — parameterized queries only)
- NextAuth.js (Google, PKCE) for OAuth handshake + custom short-lived JWT (15min access / 7d
  refresh, rotated, hashed at rest) for API auth, httpOnly + Secure + SameSite=strict cookies
- Gemini API (free tier), streaming via SSE
- No Mongo, no microservices, no extra infra unless explicitly requested

## Hard Rules — violating these is a build failure, not a style nitpick

1. **Auth-gate everything server-side, never client-side-only.** Any dashboard/CRM/agent/inbox
   route must check session server-side and redirect unauthenticated requests. Never render
   protected data and rely on a client-side `if (session)` check to hide it after the fact — that
   is not real protection and we have already shipped this bug once.

2. **Every tenant-scoped query must filter by tenantId pulled from the verified server session**,
   never from a client-supplied parameter, hardcoded value, or unscoped query. Write the tenant
   filter as a single reusable helper/middleware, not copy-pasted per route. If you cannot prove a
   query is tenant-scoped, treat it as a bug.

3. **No dead UI.** Every button, form, and input must be wired to a real handler that performs a
   real action against the real DB/API. If a feature is intentionally mocked (e.g. WhatsApp send),
   it must still execute end-to-end against a mock backend and visibly confirm success/failure in
   the UI — never a disabled or no-op control left in place silently.

4. **No silent failures.** Every async operation (API call, Gemini call, DB write) must have
   explicit error handling that surfaces to console AND to the UI in some visible form (toast,
   inline error, etc). A blank result with no error is worse than a visible error.

5. **Seed data must be verifiably connected.** After running the seed script, the agent must query
   the DB directly (not just trust the script exit code) and confirm rows exist with the correct
   tenantId before declaring a phase done.

6. **Definition of done for any phase = demonstrated, not described.** Before marking a phase/task
   complete, the agent must: (a) run the app, (b) perform the actual user action through the UI or
   a curl/API call, (c) show the real output/response, not assert it should work. "This should now
   work" is not an acceptable completion statement.

## Build Order
Follow phases sequentially. Do not start a new phase until the previous phase passes its own
Definition of Done above. Phases:

0. Prisma schema + migration + seed (verify rows exist via direct query)
1. Auth & tenant isolation (verify: incognito window shows ONLY login screen, no protected content)
2. AI Agent — streaming + 5 tools + audit logging (verify: real Gemini response visible in UI,
   real AuditLog rows written)
3. CRM — Contacts/Opportunities CRUD (verify: create/edit/delete actually persists and reflects in UI)
4. Unified Inbox (verify: seeded messages render with summary/sentiment/intent populated, not blank)
5. WhatsApp integration — sandbox/mock acceptable but must be wired end-to-end
6. Workflow automation — qualify lead chain (verify: full chain fires and produces visible
   AuditLog entries for each step, not just the final state)
7. Dashboard — real DB aggregates only, no hardcoded/placeholder numbers
8. Testing — auth, tenant isolation, AI tool-calling, one frontend component

## Decision Logging
Log every non-trivial decision (library choice, schema tradeoff, scope cut) to DECISIONS.md as a
one-line entry: what was decided, why, what was the alternative. This file is read by the human
before the demo — write it for someone who needs to defend the decision out loud, not for another
AI.

## When Uncertain
If a requirement is ambiguous, choose the fastest reasonable interpretation, implement it, and log
the assumption to DECISIONS.md. Do not block waiting for clarification unless the ambiguity could
cause a security issue (e.g. unclear tenant boundary) — in that case, default to the MORE
restrictive interpretation and flag it.

## Explicitly Out of Scope (unless human says otherwise)
Voice AI, real production WAF/SOC2-style hardening, automated CI/CD, horizontal scaling concerns.
State these as deliberate cuts in README, not gaps.
