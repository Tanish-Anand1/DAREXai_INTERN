import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { cookieNames, verifyAccessToken } from "@/lib/tokens";
import { LandingPage } from "./landing-client";


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

  
  return <LandingPage />;
}
