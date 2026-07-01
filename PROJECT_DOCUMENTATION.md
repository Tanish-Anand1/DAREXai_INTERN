# Darex AI Operations Platform — Internship Challenge Documentation

This document provides a comprehensive technical overview of the Darex AI Operations Platform. It details the system architecture, stack choices, security models, multi-tenant isolation, AI orchestration, and instructions for running a live walkthrough demo.

---

## 🏗️ 1. Technical Stack

*   **Framework**: Next.js 14 (App Router) with TypeScript.
*   **State Management**: React Query (caching and API mutations) + Zustand (global UI state and sidebar toggle).
*   **Styling**: Vanilla CSS (`globals.css`) with Tailwind CSS. Styled using a custom **Space-Gray Charcoal SaaS theme** inspired by Dribbble layouts.
*   **Database**: PostgreSQL running in a Docker container on port `5433` (mapped from `5432` internally to prevent conflicts with local hosts).
*   **ORM**: Prisma (using strict parameterized queries to prevent SQL injections).
*   **Authentication**: NextAuth.js (Google OAuth PKCE) paired with first-party short-lived JWTs (15-min access, 7d rotated refresh tokens stored in `httpOnly` secure cookies).
*   **AI Integration**: Google Gemini API via the official `@google/generative-ai` SDK.

---

## 🔒 2. Security & Tenant Isolation Model

### 1. Centralized Tenant Isolation (`tenantScopedPrisma`)
To prevent cross-tenant data leaks, all CRM, Messaging, and Task database operations are executed via a custom Prisma Client extension:
*   It automatically intercepts queries and appends `where: { tenantId: auth.tenantId }` to every read operation (`findMany`, `findFirst`, etc.).
*   It automatically injects the active user's `tenantId` into all write operations (`create`, `update`, `delete`).
*   Direct access using the base Prisma client is strictly forbidden in application route handlers (used only in background auth and seeding scripts).

### 2. Dual-Layer Auth Gating
*   **Server-Side Middleware (`middleware.ts`)**: Every request to a `/dashboard`, `/onboarding`, or protected API path is intercepted at the edge. If the NextAuth session or custom JWT cookies are missing, the user is immediately redirected to `/login`. No protected code or data is ever compiled or rendered for unauthenticated clients.

---

## 🤖 3. AI Agent & Tool Orchestration

The AI Agent acts as an interactive operator that reads user intent, triggers local CRM operations, and replies in natural language.

### 1. Server-Sent Events (SSE) Streaming
The chat endpoint (`/api/agent/chat`) communicates with the frontend via a persistent text/event-stream. This allows the AI model to stream intermediate progress, tool call events, and final text chunks in real-time.

### 2. Dynamic Tool Calling Loop
1.  **Intent Classification**: Gemini receives the conversation history, user query, and current CRM facts.
2.  **Tool Selection**: Gemini outputs a function call request (e.g. `search_contacts`).
3.  **Local Execution**: The server intercepts the function call, executes it using `tenantScopedPrisma` locally, logs the action to `AuditLog`, and feeds the data back to Gemini.
4.  **Final Response**: Gemini digests the database output and generates the final response, starting with a `"Why: [reasoning]"` block.

### 3. Fail-Safe Smart Fallback Heuristics
If the Gemini API key is rate-limited or quota-exhausted (returning 429), the platform automatically falls back to a **smart local natural language generator**. It parses the prompt keywords and returns highly realistic, context-specific responses (searching contacts, analyzing metrics, calculating pipeline, or confirming task schedules), ensuring the dashboard demo remains functional.

---

## 🔄 4. Implemented Modules

### 1. CRM Pipeline (Contacts & Opportunities)
*   **Contacts**: Table display with complete CRUD capabilities.
*   **Opportunities**: Kanban board representing stages (`New`, `Qualified`, `Proposal`, `Negotiation`, `Closed Won`).
*   **AI Next Best Action**: Analyses deal state and generates a single natural, human-like recommendation (e.g. *"Call Aarav Mehta to follow up on the enterprise automation pilot"*).

### 2. Unified Inbox
*   Consolidates Emails, Call logs, and WhatsApp messages.
*   Runs automatic AI sentiment analysis (`positive`, `neutral`, `negative`) and intent classification (`purchase`, `inquiry`, etc.) on all messages.

### 3. WhatsApp Integration Sandbox
*   Exposes a webhook listener at `/api/webhooks/whatsapp`.
*   Locates the contact by phone number in the database, resolves their `tenantId`, and dynamically maps incoming messages to their unified inbox thread.

### 4. Workflow Automation (Qualify Lead)
*   Runs an automated multi-step pipeline:
    1. Loads Opportunity details.
    2. Generates an AI Qualification Score (0-100) and a short, punchy 2-sentence summary.
    3. If the score is > 80, triggers a mock WhatsApp message and schedules a follow-up Task.
    4. Writes detailed step-by-step logs to the `AuditLog` table.

---

## 🖥️ 5. Walkthrough Demo Script

To demonstrate the platform to evaluators, perform the following steps:

1.  **Open the App**: Navigate to `http://localhost:3000`. If not logged in, verify you are redirected to `/login`.
2.  **Dashboard Overview**: View the dashboard cards containing trend sparklines, monthly pipeline targets, and live audit logs.
3.  **CRM Contacts**: Go to the Contacts tab. Add a contact (e.g., name: `Aarav Mehta`, phone: `+919876543210`).
4.  **Opportunities Board**: Create a new opportunity for Aarav, then click **Generate Next Best Action**. Verify it creates a natural, clean action without markdown asterisks.
5.  **Workflow Automation**: Go to the Workflows tab, select the opportunity, and click **Run Qualify Lead**. Watch the steps execute, score the lead, simulate sending a WhatsApp notification, and schedule a task.
6.  **Verify DB Rows**: Open a terminal and run `npx prisma studio`. Open the `Task`, `Message`, and `AuditLog` tables to prove all items were successfully written to PostgreSQL under the correct `tenantId`.
