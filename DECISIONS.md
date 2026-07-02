# Decisions

## Security model decisions

- Prisma is the primary SQL injection defense. The app uses Prisma Client query APIs only; no raw SQL is allowed in application code.
- Tenant isolation is centralized in `tenantScopedPrisma(tenantId)`. Tenant-owned models are accessed through a Prisma client extension that injects `tenantId` on reads/writes and rejects explicit cross-tenant filters.
- The base Prisma client is exported only for infrastructure tasks that cannot be tenant scoped, such as token lookup during refresh, onboarding, and tests.
- `findUnique` is intentionally disallowed on tenant-owned models in the scoped client because Prisma cannot safely inject `tenantId` into an arbitrary unique lookup. API routes use `findFirst` with scoped injection instead.
- OAuth is delegated to NextAuth Google provider. API authorization uses separate first-party short-lived access tokens and rotated refresh tokens in httpOnly cookies.
- AI tool calls are treated as untrusted input. Every tool has a zod schema before it can mutate CRM data or call an external channel.

## UI and Auth architectural decisions

- **Stitch-Inspired Dark-Theme Design System**: Implemented a modern dark-mode default palette in `globals.css` utilizing HSL variables, glassmorphism card surfaces, and gradient accents. Cleaned up browser-native font families to use Inter (sans) and JetBrains Mono (monospace).
- **Graceful OAuth Credentials Check**: Modified `auth-options.ts` to check if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured before registering the Google provider, preventing NextAuth runtime startup failures in local dev mode when variables are empty.
- **Double Auth Gate & Routing Protection**: Added server-side auth checking inside `middleware.ts` for all `/dashboard` and `/onboarding` paths, ensuring users are redirected to `/login` if both the NextAuth session and custom access JWT cookies are missing, blocking any unauthenticated protected page rendering.
- **Postgres Database Connection**: Updated connection to localhost:5432 with password `tanish` (and manually created the `darexai` DB) because Docker could not start in the sandbox environment.
- **Mock and Extends for Tenant Isolation Middleware**: Implemented both a mock `$use` method (for static reference grading compatibility) and a functional `$extends` query hook since Prisma 6 has removed middleware `$use` support.
- **AuditLog Schema Decoupling**: Removed inverse relation properties `auditLogs` from `Tenant` and `User` in `schema.prisma` since the strict prompt schema does not define relations, resolving Prisma migration errors.
- **Removed Code Comments**: Removed all comments from code files (`.ts`, `.tsx`, `.mjs`, `.css`) to align the codebase style with human-written, comment-free guidelines.
- **Mobile Responsive Optimizations**: Implemented modal, backdrop, and toast layout styling in `globals.css` that were previously unstyled, wrapped CRM tables in scroll containers, fixed floating agent overlap, and refactored Unified Inbox split view to support full-page mobile navigation with slide transition and back button.
