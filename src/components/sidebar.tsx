"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Bot,
  Users,
  BriefcaseBusiness,
  Inbox,
  Workflow,
  LogOut,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUiStore } from "@/store/ui";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/agent", label: "AI Agent", icon: Bot },
  { href: "/dashboard/crm/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/crm/opportunities", label: "Opportunities", icon: BriefcaseBusiness },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/workflows", label: "Workflows", icon: Workflow },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className="sidebar"
      style={{ width: sidebarCollapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div
          className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded border border-default bg-tertiary"
        >
          <Zap size={15} className="text-primary" />
        </div>
        {!sidebarCollapsed && (
          <div className="animate-fade-in">
            <h1 className="text-xs font-semibold tracking-tight text-primary">Darex AI</h1>
            <p style={{ fontSize: "0.625rem", color: "var(--text-tertiary)" }}>Operations Console</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={15} className="opacity-80" />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div
        className="px-2 py-3 space-y-2"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {session?.user && (
          <div className="flex items-center gap-2.5 px-2">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-7 w-7 rounded border border-default"
              />
            ) : (
              <div
                className="flex h-7 w-7 min-w-[28px] items-center justify-center rounded border border-default text-xs font-semibold bg-tertiary text-secondary"
              >
                {(session.user.name ?? session.user.email ?? "U")[0].toUpperCase()}
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="min-w-0 animate-fade-in">
                <p className="text-xs font-medium truncate text-primary">
                  {session.user.name ?? "User"}
                </p>
                <p className="text-[10px] truncate text-tertiary">
                  {session.user.email}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-0.5">
          <button
            className="sidebar-nav-item w-full"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
          >
            <LogOut size={15} className="opacity-80" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>

          {/* Collapse toggle */}
          <button
            className="sidebar-nav-item w-full"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
