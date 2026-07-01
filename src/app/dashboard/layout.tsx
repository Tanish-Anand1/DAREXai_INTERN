import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { DashboardShell } from "@/components/dashboard-shell";

/**
 * Dashboard layout: server-side auth gate + DashboardShell wrapper.
 * Every route under /dashboard is protected here — no client-side-only checks.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
