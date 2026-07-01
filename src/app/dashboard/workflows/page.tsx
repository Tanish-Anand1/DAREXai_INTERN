"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Workflow, Play, CheckCircle2, Loader2, AlertCircle, MessageSquare, ListTodo, BarChart3,
} from "lucide-react";
import { useUiStore } from "@/store/ui";

type Opportunity = { id: string; title: string; stage: string; value: string; contact?: { name: string } };

type WorkflowStep = {
  step: string;
  payload: Record<string, unknown>;
  timestamp: Date;
};

function getCsrf() {
  return decodeURIComponent(
    document.cookie.split("; ").find((r) => r.startsWith("darex_csrf="))?.split("=")[1] ?? ""
  );
}

const STEP_META: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  loaded_opportunity: { label: "Opportunity Loaded", icon: BarChart3, color: "var(--info)" },
  scored: { label: "AI Qualification Score", icon: CheckCircle2, color: "var(--accent-primary)" },
  sent_whatsapp: { label: "WhatsApp Sent", icon: MessageSquare, color: "var(--success)" },
  created_task: { label: "Follow-up Task Created", icon: ListTodo, color: "var(--warning)" },
};

export default function WorkflowsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const { selectedOpportunityId, setSelectedOpportunityId } = useUiStore();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [error, setError] = useState("");

  const opportunities = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const res = await fetch("/api/crm/opportunities");
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ opportunities: Opportunity[] }>;
    },
    enabled: Boolean(session?.user?.tenantId),
  });

  async function runQualifyLead() {
    const oppId = selectedOpportunityId ?? opportunities.data?.opportunities[0]?.id;
    if (!oppId) {
      setError("No opportunity selected. Create one first.");
      return;
    }
    setSelectedOpportunityId(oppId);
    setSteps([]);
    setError("");
    setRunning(true);

    try {
      const res = await fetch("/api/automation/qualify-lead", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
        body: JSON.stringify({ opportunityId: oppId }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.error) {
                setError(payload.error);
              } else if (payload.step) {
                setSteps((prev) => [...prev, { step: payload.step, payload: payload.payload ?? {}, timestamp: new Date() }]);
              }
            } catch {
              // non-JSON line
            }
          }
        }
      }
      qc.invalidateQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow failed");
    } finally {
      setRunning(false);
    }
  }

  const selectedOpp = opportunities.data?.opportunities.find((o) => o.id === selectedOpportunityId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Workflow size={24} style={{ color: "var(--accent-primary)" }} />
          Workflow Automation
        </h1>
        <p className="mt-1" style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
          Lead → AI Qualification → WhatsApp Follow-up → Task Creation → Audit Log
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Config panel */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Qualify Lead Workflow
          </h3>

          {/* Opportunity selector */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Select Opportunity
            </label>
            <select
              className="field"
              value={selectedOpportunityId ?? ""}
              onChange={(e) => setSelectedOpportunityId(e.target.value || undefined)}
            >
              <option value="">Select an opportunity...</option>
              {opportunities.data?.opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} ({o.stage}) — ${Number(o.value).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {selectedOpp && (
            <div className="rounded-lg p-3" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{selectedOpp.title}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                Stage: {selectedOpp.stage} • Contact: {selectedOpp.contact?.name ?? "None"}
              </p>
            </div>
          )}

          {/* Workflow steps description */}
          <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>WORKFLOW STEPS</p>
            {[
              "Load opportunity from CRM",
              "AI generates qualification score (0-100)",
              "If score > 80 → Send WhatsApp follow-up",
              "Create follow-up task",
              "Record audit log for each step",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs font-mono mt-0.5" style={{ color: "var(--accent-primary)" }}>{i + 1}</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{step}</span>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={runQualifyLead}
            disabled={running || !opportunities.data?.opportunities.length}
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? "Running..." : "Run Qualify Lead"}
          </button>
        </div>

        {/* Execution results */}
        <div className="card">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Execution Steps
          </h3>

          {error && (
            <div className="rounded-lg p-4 mb-4 flex items-start gap-3 animate-fade-in" style={{ background: "var(--danger-bg)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={16} style={{ color: "var(--danger)", marginTop: "2px" }} />
              <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
            </div>
          )}

          {steps.length === 0 && !running ? (
            <div className="empty-state" style={{ padding: "48px" }}>
              <Workflow size={40} />
              <p>Run the workflow to see live execution steps</p>
            </div>
          ) : (
            <div className="space-y-0">
              {steps.map((s, i) => {
                const meta = STEP_META[s.step] ?? { label: s.step, icon: CheckCircle2, color: "var(--text-secondary)" };
                const Icon = meta.icon;
                return (
                  <div key={i} className="workflow-step animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="workflow-step-dot complete" style={{ borderColor: meta.color, background: `${meta.color}15`, color: meta.color }}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{meta.label}</p>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {s.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                      <pre
                        className="mt-1.5 rounded-md px-3 py-2 text-xs"
                        style={{
                          background: "var(--bg-tertiary)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-subtle)",
                          fontFamily: "var(--font-mono)",
                          maxHeight: "120px",
                          overflowY: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {JSON.stringify(s.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                );
              })}
              {running && (
                <div className="workflow-step animate-fade-in">
                  <div className="workflow-step-dot active">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Processing...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
