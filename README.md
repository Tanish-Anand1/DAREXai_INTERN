# Darex AI Operations Platform

A production-inspired, multi-tenant AI Business Operations Platform that acts as an intelligent business assistant. Powered by Next.js 14 App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, and Google's Gemini API.

---

## 🏗 Architectural Architecture & Security Blueprint

### 1. Dual-Gated Authentication & Tenant Isolation
* **Authentication**: Leverages Google OAuth (PKCE) via NextAuth.js for the initial identity handshake. Post-authentication, the system exchanges the session at `/api/auth/exchange` to generate short-lived custom Access JWTs (15 minutes) and long-lived Refresh JWTs (7 days) stored in secure, `httpOnly`, `SameSite=strict` cookies.
* **Token Rotation**: Implements automatic Refresh Token Rotation (RTR). Detection of an already used refresh token immediately revokes the entire token family, preventing token theft exploits.
* **Tenant Isolation**: Centralized database isolation using Prisma Client Extensions (`src/lib/prisma.ts`). Every model with `tenantId` is automatically filtered by the tenant identifier pulled from the verified server session, preventing cross-tenant data leaks. Explicit queries targeting cross-tenant IDs are rejected automatically at the query level.
* **Explicit CORS & Input Validation**: All backend API endpoints are explicitly protected with Zod validation schemas to prevent malformed parameter payloads. Cross-Origin Resource Sharing (CORS) is explicitly configured inside `middleware.ts` to restrict API requests to the verified host application origin, enforcing secure cross-origin boundaries.

### 2. Intelligent AI Agent & Server-Side Tool Calling
* **Native Tool Integration**: Utilizes Gemini's native function calling interface. The agent dynamically decides when to query customer contacts, create tasks, update opportunity statuses, dispatch WhatsApp follow-ups, or fetch KPIs.
* **Explainability**: Prompts enforce a strict "Why" reasoning output structure at the beginning of each assistant response, explaining the recommendations directly to the user.
* **Stateful Conversations**: Chat logs and message histories are persisted to the database and loaded into a persistent conversations side menu.

### 3. Production-Ready WhatsApp webhook Integration
* **Meta Cloud API Webhook**: Supports official nested Meta webhook payloads. On incoming messages, the webhook validates signatures and dynamically queries the contact list by phone number, automatically resolving the sender's `tenantId` and `contactId` dynamically.
* **Sandbox Fallback**: Defaults to a mock sandbox endpoint for local testing when Meta developer credentials are not configured.

---

## 🎨 Minimalist UI Aesthetics

The user interface follows a high-end, clean minimalist aesthetic inspired by tools like Linear and Vercel:
* **Default Dark Mode**: Deep slate background, high-contrast text layout, and subtle borders.
* **Focus on Functionality**: Removed unnecessary flashy elements to prioritize clean, readable layouts.
* **Typography**: Custom fonts configured (Inter for interfaces, JetBrains Mono for payloads and metrics).

---

## 🚀 Local Setup Instructions

### Prerequisites
* **Node.js**: v18+
* **Docker**: Signed in and active for local PostgreSQL containerization.

### Installation
1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Copy and configure your environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GEMINI_API_KEY`.
3. Start the PostgreSQL Docker container:
   ```bash
   docker run --name pg-darexai -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=darexai -p 5433:5432 -d postgres:latest
   ```
4. Run Prisma database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Seed the database:
   ```bash
   npx prisma db seed
   ```
6. Launch the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

To run the full suite of unit and integration tests (testing Auth Refresh, Tenant Isolation, AI Tools, and Component rendering):
```bash
npm run test
```
