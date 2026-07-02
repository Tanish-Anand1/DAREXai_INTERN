"use client";

import { Sidebar } from "@/components/sidebar";
import { useUiStore } from "@/store/ui";
import { useEffect, useState } from "react";
import { Menu, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SideAgent } from "@/components/side-agent";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, toggleMobileSidebar } = useUiStore();
  const [isMobile, setIsMobile] = useState(false);
  const [cookieConsentOpen, setCookieConsentOpen] = useState(false);

  
  useEffect(() => {
    fetch("/api/security/csrf").catch(() => undefined);
    
    
    const accepted = localStorage.getItem("darex-cookies-accepted");
    if (!accepted) {
      setCookieConsentOpen(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("darex-cookies-accepted", "true");
    setCookieConsentOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {}
        {isMobile && (
          <header 
            className="flex items-center justify-between px-4 py-3 bg-secondary border-b border-subtle z-20 sticky top-0"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-default bg-tertiary">
                <Zap size={13} style={{ color: "var(--accent-primary)" }} />
              </div>
              <span className="text-xs font-bold text-primary">Darex AI Console</span>
            </div>
            
            <button
              onClick={toggleMobileSidebar}
              className="btn btn-secondary p-2 rounded-lg flex items-center justify-center"
              style={{ border: "1px solid var(--border-default)" }}
              title="Open menu"
            >
              <Menu size={16} />
            </button>
          </header>
        )}

        <main
          className="flex-1 min-h-screen transition-all"
          style={{
            marginLeft: isMobile 
              ? "0" 
              : (sidebarCollapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)"),
            transitionDuration: "var(--transition-base)",
          }}
        >
          <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {}
      <AnimatePresence>
        {cookieConsentOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-sm z-50 card-glass p-5 flex flex-col gap-4 border"
            style={{ 
              borderColor: "var(--border-default)", 
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)"
            }}
          >
            <div>
              <p className="text-xs font-bold text-primary mb-1">🍪 Allow Session Cookies?</p>
              <p className="text-[10px] leading-relaxed text-secondary">
                We use cookies to secure your workspace, manage OAuth handshakes, and prevent cross-site request forgery (CSRF) attacks.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button 
                onClick={() => setCookieConsentOpen(false)}
                className="btn btn-secondary text-[10px] py-1.5 px-3"
              >
                Decline
              </button>
              <button 
                onClick={acceptCookies}
                className="btn btn-primary text-[10px] py-1.5 px-3.5 font-semibold"
              >
                Accept Cookies
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <SideAgent />
    </div>
  );
}
