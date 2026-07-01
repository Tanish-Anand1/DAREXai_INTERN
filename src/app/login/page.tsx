"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, Loader2, ShieldCheck, Zap, Bot, BarChart3 } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const { data: session, status } = useSession();
  const [error, setError] = useState("");
  const [exchanging, setExchanging] = useState(false);
  const searchParams = useSearchParams();

  // Display NextAuth error from query params (e.g. ?error=OAuthCallback)
  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      const messages: Record<string, string> = {
        OAuthCallback: "OAuth callback failed. Check your Google Client ID/Secret and redirect URI.",
        OAuthSignin: "Could not start the OAuth flow. Verify credentials are configured.",
        Configuration: "Server configuration error. Check environment variables.",
        Default: `Authentication error: ${authError}`,
      };
      setError(messages[authError] ?? messages.Default);
    }
  }, [searchParams]);

  // After NextAuth authenticates, exchange for our custom JWT tokens
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

  return (
    <section className="w-full max-w-sm p-6 bg-secondary border border-default rounded-md animate-slide-up relative">
      {/* Logo & branding */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-10 w-10 items-center justify-center rounded border border-default bg-tertiary"
        >
          <Zap size={18} className="text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          Darex AI Console
        </h1>
        <p className="mt-1.5 text-xs text-secondary">
          Intelligent multi-tenant business operations
        </p>
      </div>

      {/* Feature chips */}
      <div className="mb-6 flex flex-wrap justify-center gap-1.5">
        {[
          { icon: Bot, label: "AI Agent" },
          { icon: BarChart3, label: "CRM" },
          { icon: ShieldCheck, label: "Secure" },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="badge" style={{ fontSize: "0.6875rem" }}>
            <Icon size={10} /> {label}
          </span>
        ))}
      </div>

      {/* Auth state */}
      {status === "authenticated" ? (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-center gap-2 rounded border border-default p-3 bg-tertiary">
            {exchanging ? (
              <>
                <Loader2 size={14} className="animate-spin text-secondary" />
                <span className="text-xs text-secondary">
                  Provisioning workspace...
                </span>
              </>
            ) : (
              <span className="text-xs text-secondary">
                Signed in as {session.user?.email}
              </span>
            )}
          </div>
          <button
            className="btn btn-secondary w-full py-2 text-xs"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            className="btn btn-primary w-full py-2.5 text-xs"
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
          <p className="text-center text-[10px] text-tertiary">
            Your workspace is automatically provisioned on first login
          </p>
        </div>
      )}

      {/* Error display */}
      {error ? (
        <div className="mt-3 rounded border border-danger/20 p-3 bg-danger-bg animate-fade-in">
          <p className="text-xs text-danger leading-relaxed">{error}</p>
        </div>
      ) : null}
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="login-bg flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={
        <div className="bg-secondary border border-default w-full max-w-sm p-6 flex items-center justify-center min-h-[260px] rounded-md">
          <Loader2 size={20} className="animate-spin text-secondary" />
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}
