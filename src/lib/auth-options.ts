import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  providers: [
    // Only register Google provider if credentials are configured.
    // This prevents NextAuth from crashing at startup when GOOGLE_CLIENT_ID is empty.
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            checks: ["pkce", "state"],
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, profile }) {
      const email = profile?.email ?? token.email;
      if (email) {
        const user = await prisma.user.findFirst({ where: { email } });
        if (user) {
          token.appUserId = user.id;
          token.tenantId = user.tenantId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.appUserId ?? "");
        session.user.tenantId = String(token.tenantId ?? "");
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const existing = await prisma.user.findFirst({
        where: { email: user.email ?? "" },
      });
      if (existing) {
        await prisma.auditLog.create({
          data: {
            tenantId: existing.tenantId,
            userId: existing.id,
            action: "auth.signin",
            target: "nextauth",
            metadata: {},
          },
        });
      }
    },
  },
};
