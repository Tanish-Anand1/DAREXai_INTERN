"use client";

import { Sidebar } from "@/components/sidebar";
import { useUiStore } from "@/store/ui";
import { useEffect } from "react";

/**
 * DashboardShell wraps all dashboard pages with the sidebar and main content area.
 * The CSRF token is fetched once on mount to enable state-changing API requests.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUiStore();

  // Fetch CSRF token on mount for subsequent API calls
  useEffect(() => {
    fetch("/api/security/csrf").catch(() => undefined);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <main
        className="flex-1 min-h-screen transition-all"
        style={{
          marginLeft: sidebarCollapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
          transitionDuration: "var(--transition-slow)",
        }}
      >
        <div className="p-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
