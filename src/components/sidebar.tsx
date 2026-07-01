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
  X,
} from "lucide-react";
import { useUiStore } from "@/store/ui";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

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
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUiStore();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto close sidebar on path change in mobile view
  useEffect(() => {
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [pathname, isMobile, setMobileSidebarOpen]);

  const variants = {
    desktop: {
      width: sidebarCollapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
      x: 0,
      transition: { duration: 0.2, ease: "easeOut" as const },
    },
    mobileOpen: {
      width: "var(--sidebar-width)",
      x: 0,
      transition: { duration: 0.25, ease: "easeOut" as const },
    },
    mobileClosed: {
      width: "var(--sidebar-width)",
      x: "-100%",
      transition: { duration: 0.25, ease: "easeOut" as const },
    },
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      <AnimatePresence>
        {isMobile && mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        className="sidebar fixed top-0 bottom-0 left-0"
        variants={variants}
        animate={isMobile ? (mobileSidebarOpen ? "mobileOpen" : "mobileClosed") : "desktop"}
        style={{
          boxShadow: isMobile ? "10px 0 30px rgba(0,0,0,0.3)" : "4px 0 25px rgba(0, 0, 0, 0.15)",
          zIndex: isMobile ? 50 : 30,
        }}
      >
        {/* Logo and Close Button (Mobile Only) */}
        <div
          className="flex items-center justify-between gap-2.5 px-4 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-xl border border-default bg-tertiary"
              style={{ boxShadow: "0 0 15px rgba(167, 139, 250, 0.15)" }}
            >
              <Zap size={15} className="text-primary" style={{ color: "var(--accent-primary)" }} />
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <div>
                <h1 className="text-xs font-bold tracking-tight gradient-text">Darex AI</h1>
                <p style={{ fontSize: "0.625rem", color: "var(--text-tertiary)" }}>Operations Console</p>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="btn btn-ghost btn-icon lg:hidden p-1 text-secondary"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
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
                title={sidebarCollapsed && !isMobile ? label : undefined}
              >
                <Icon size={15} className="opacity-80" />
                {(!sidebarCollapsed || isMobile) && <span>{label}</span>}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-full"
                    style={{ background: "var(--accent-gradient)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile & Actions */}
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
                  className="flex h-7 w-7 min-w-[28px] items-center justify-center rounded-lg border border-default text-xs font-semibold avatar-gradient"
                >
                  {(session.user.name ?? session.user.email ?? "U")[0].toUpperCase()}
                </div>
              )}
              {(!sidebarCollapsed || isMobile) && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-primary">
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
              {(!sidebarCollapsed || isMobile) && <span>Sign out</span>}
            </button>

            {/* Collapse toggle (Desktop Only) */}
            {!isMobile && (
              <button
                className="sidebar-nav-item w-full"
                onClick={toggleSidebar}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                {!sidebarCollapsed && <span>Collapse</span>}
              </button>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}
