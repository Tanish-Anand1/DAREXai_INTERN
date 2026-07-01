import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { cookieNames, verifyAccessToken } from "@/lib/tokens";
import { LandingPage } from "./landing-client";

/**
 * Root page: authenticated users → dashboard, unauthenticated → stunning landing page.
 * Server-side auth gate — never renders protected data on the client.
 */
export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    const access = cookies().get(cookieNames.access)?.value;
    if (access) {
      try {
        await verifyAccessToken(access);
        redirect("/dashboard");
      } catch {
        redirect("/login");
      }
    }
    redirect("/login");
  }

  // Unauthenticated: show the landing page
  return <LandingPage />;
}
