import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { cookieNames, verifyAccessToken } from "@/lib/tokens";

/**
 * Root page: redirect authenticated users to /dashboard, unauthenticated to /login.
 * Server-side auth gate — never renders protected content on the client.
 */
export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  // If user has a valid access token, go to dashboard
  const access = cookies().get(cookieNames.access)?.value;
  if (access) {
    try {
      await verifyAccessToken(access);
      redirect("/dashboard");
    } catch {
      // Token expired or invalid — send to login to re-exchange
      redirect("/login");
    }
  }

  // Has NextAuth session but no access token — send to login which will auto-exchange
  redirect("/login");
}
