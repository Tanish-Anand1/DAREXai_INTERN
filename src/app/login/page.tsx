"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, Loader2, ShieldCheck, Zap, Bot, BarChart3 } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function LoginContent() {
  const { data: session, status } = useSession();
  const [error, setError] = useState("");
  const [exchanging, setExchanging] = useState(false);
  const searchParams = useSearchParams();

  
  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      setError(authError);
    }
  }, [searchParams]);

  
  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;
    async function exchange() {
      setExchanging(true);
      try {
        const res = await fetch("/api/auth/exchange", {
          method: "POST",
          headers: { "content-type": "application/json" },
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
        if (!cancelled) {
          if (data.needsOnboarding) {
            window.location.replace("/onboarding");
          } else {
            window.location.replace("/dashboard");
          }
        }
      } catch (err) {
        console.error("API session exchange failed", err);
        if (!cancelled) {
          setExchanging(false);
          setError(err instanceof Error ? err.message : "API session exchange failed");
        }
      }
    }

    void exchange();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const errorMessages: Record<string, string> = {
    OAuthSignin: 'Sign in failed.',
    OAuthCallback: 'OAuth callback failed.',
    CredentialsSignin: 'Invalid credentials.',
    default: 'Authentication error.',
  };
  const displayError = error ? (errorMessages[error as string] || errorMessages.default) : null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm relative"
    >
      {}
      <div className="card-glass p-7 rounded-2xl" style={{ border: "1px solid rgba(139, 92, 246, 0.15)" }}>
        {}
        <div className="mb-7 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--accent-gradient)", boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}
          >
            <Zap size={22} color="#fff" />
          </div>
          <h1 className="text-xl font-bold tracking-tight gradient-text">
            Darex AI Console
          </h1>
          <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            Intelligent multi-tenant business operations
          </p>
        </div>

        {}
        <div className="mb-7 flex flex-wrap justify-center gap-1.5">
          {[
            { icon: Bot, label: "AI Agent" },
            { icon: BarChart3, label: "CRM" },
            { icon: ShieldCheck, label: "Secure" },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="badge badge-accent" style={{ fontSize: "0.6875rem" }}>
              <Icon size={10} /> {label}
            </span>
          ))}
        </div>

        {/* Auth state */}
        {status === "authenticated" ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-center gap-2 rounded-xl p-3"
              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-default)" }}>
              {exchanging ? (
                <>
                  <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Provisioning workspace...
                  </span>
                </>
              ) : (
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Signed in as {session.user?.email}
                </span>
              )}
            </div>
            <button
              className="btn btn-secondary w-full py-2.5 text-xs"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              className="btn btn-primary w-full py-3 text-xs font-semibold"
              onClick={() => signIn("google", { callbackUrl: "/login" })}
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LogIn size={14} />
              )}
              Sign in with Google
            </button>
            <p className="text-center text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              Your workspace is automatically provisioned on first login
            </p>
          </div>
        )}

        {/* Error display */}
        {displayError && <div className="text-red-500">{displayError}</div>}
      </div>
    </motion.section>
  );
}

export default function LoginPage() {
  return (
    <main className="login-bg grid-pattern flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={
        <div className="card-glass w-full max-w-sm p-7 flex items-center justify-center min-h-[300px] rounded-2xl">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}
