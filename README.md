# Darex AI Operations Platform

This is a multi-tenant business operations platform featuring a CRM, AI Agent, Unified Inbox, and Workflow Automation. It is built as a Next.js evaluation project.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **AI**: Gemini API

---

## Key Features & Security Model

### 1. Authentication & Multi-Tenancy
- Identity handshake is handled via Google OAuth (PKCE) in NextAuth.js.
- Post-handshake, a custom token-exchange route (`/api/auth/exchange`) issues short-lived Access JWTs (15 minutes) and rotated Refresh JWTs (7 days) stored in `httpOnly` secure cookies.
- All database queries are automatically scoped by `tenantId` via a custom Prisma `$extends` query hook (`src/lib/prisma.ts`). The tenant ID is always resolved server-side from the verified JWT session.

### 2. CRM & Automation
- CRUD endpoints and UI tables for managing Contacts and Opportunities.
- Workflow automation that handles scoring prompts and lead qualification.
- Unified Inbox displaying seeded customer messages with sentiment and intent classification.

### 3. AI Agent
- An intelligent side-agent using Gemini native tool-calling (function calling) to trigger CRM CRUD operations, retrieve metrics, and interact with mock external channels.
- Reasoning explainability: The agent prefixes its answers with a "Why" block explaining its reasoning.

### 4. WhatsApp Sandbox Integration
- Flat and nested official-spec Meta Cloud API webhook parsing in `/api/webhooks/whatsapp`.
- A fallback mock sandbox interface is provided at `/api/mock/whatsapp` for local testing.

---

## Local Development Setup

### Prerequisites
- Node.js (v18+)
- Local PostgreSQL instance (or Docker)

### Setup Steps
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GEMINI_API_KEY`.
3. Apply database migrations:
   ```bash
   npx prisma migrate dev
   ```
4. Seed the database with demo records:
   ```bash
   npx prisma db seed
   ```
5. Run the local dev server:
   ```bash
   pnpm dev
   ```
   Access the app at `http://localhost:3000`.

---

## Testing
Run the test suite (Vitest):
```bash
pnpm test
```

---

## Out of Scope / Cuts
The following features are intentionally out of scope for this evaluation project:
- Production WAF, SOC2 compliance, or DDoS mitigation.
- Automated CI/CD pipelines (excluding standard Vercel deployments).
- Database read-replicas, partitioning, or serverless scaling.
- Voice AI / phone call automation.
