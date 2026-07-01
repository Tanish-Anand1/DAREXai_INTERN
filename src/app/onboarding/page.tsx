"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Zap, Building2, Users, ArrowRight, Check, Loader2 } from "lucide-react";

import { getOrFetchCsrf } from "@/lib/client-api";

export default function OnboardingPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [contacts, setContacts] = useState([{ name: "", phone: "", company: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const csrfToken = await getOrFetchCsrf();
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          businessName: businessName || "My Business",
          firstContacts: contacts.filter((c) => c.name.trim()),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      window.location.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
      setLoading(false);
    }
  }

  return (
    <main className="login-bg flex min-h-screen items-center justify-center px-4">
      <section className="bg-secondary border border-default w-full max-w-md p-6 rounded-md animate-slide-up relative">
        
        {/* Progress Timeline */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {["Business", "Contacts", "Done"].map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-all border"
                style={{
                  background: i <= step ? "var(--text-primary)" : "transparent",
                  color: i <= step ? "var(--bg-primary)" : "var(--text-tertiary)",
                  borderColor: i <= step ? "var(--text-primary)" : "var(--border-default)",
                }}
              >
                {i < step ? <Check size={10} /> : i + 1}
              </div>
              <span className="text-[10px] uppercase font-semibold hidden sm:inline" style={{ color: i <= step ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                {label}
              </span>
              {i < 2 && <div className="w-6 h-px" style={{ background: i < step ? "var(--text-primary)" : "var(--border-default)" }} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-default bg-tertiary mx-auto mb-2">
                <Building2 size={16} className="text-secondary" />
              </div>
              <h2 className="text-base font-semibold text-primary">Setup your business workspace</h2>
              <p className="text-xs text-tertiary">Configure the default tenant settings</p>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block text-secondary">Business Name</label>
              <input className="field" placeholder="e.g. Acme Corp" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <button className="btn btn-primary w-full py-2 text-xs" onClick={() => setStep(1)}>
              Continue <ArrowRight size={14} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-default bg-tertiary mx-auto mb-2">
                <Users size={16} className="text-secondary" />
              </div>
              <h2 className="text-base font-semibold text-primary">Add your first contact</h2>
              <p className="text-xs text-tertiary">Optional — you can add contacts later in CRM</p>
            </div>
            {contacts.map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input className="field" placeholder="Name" value={c.name} onChange={(e) => { const next = [...contacts]; next[i].name = e.target.value; setContacts(next); }} />
                <input className="field" placeholder="Phone" value={c.phone} onChange={(e) => { const next = [...contacts]; next[i].phone = e.target.value; setContacts(next); }} />
                <input className="field" placeholder="Company" value={c.company} onChange={(e) => { const next = [...contacts]; next[i].company = e.target.value; setContacts(next); }} />
              </div>
            ))}
            <button
              className="btn btn-ghost w-full text-xs py-1"
              onClick={() => setContacts([...contacts, { name: "", phone: "", company: "" }])}
            >
              + Add another contact
            </button>
            <div className="flex gap-2">
              <button className="btn btn-secondary flex-1 py-2 text-xs" onClick={() => setStep(0)}>Back</button>
              <button className="btn btn-primary flex-1 py-2 text-xs" onClick={submit} disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {loading ? "Launching..." : "Complete Setup"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded border border-danger/20 p-3 bg-danger-bg">
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}
      </section>
    </main>
  );
}
