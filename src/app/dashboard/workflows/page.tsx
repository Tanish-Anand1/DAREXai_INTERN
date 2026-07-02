"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Workflow, Play, CheckCircle2, Loader2, AlertCircle, MessageSquare, ListTodo, BarChart3,
} from "lucide-react";
import { useUiStore } from "@/store/ui";
import { motion, AnimatePresence } from "framer-motion";

type Opportunity = { id: string; title: string; stage: string; value: string; contact?: { name: string } };

type WorkflowStep = {
  step: string;
  payload: Record<string, unknown>;
  timestamp: Date;
};

import { clientFetch, getOrFetchCsrf } from "@/lib/client-api";

const STEP_META: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  loaded_opportunity: { label: "Opportunity Loaded", icon: BarChart3, color: "var(--info)" },
  scored: { label: "AI Lead Qualification Score Generated", icon: CheckCircle2, color: "var(--accent-primary)" },
  sent_whatsapp: { label: "WhatsApp Outreach Dispatched", icon: MessageSquare, color: "var(--success)" },
  created_task: { label: "Follow-up Task Created in CRM", icon: ListTodo, color: "var(--warning)" },
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
    queryFn: () => clientFetch<{ opportunities: Opportunity[] }>("/api/crm/opportunities"),
    enabled: Boolean(session?.user?.tenantId),
  });

  async function runQualifyLead() {
    const oppId = selectedOpportunityId ?? opportunities.data?.opportunities[0]?.id;
    if (!oppId) {
      setError("No opportunities available. Create an opportunity in CRM first.");
      return;
    }
    setSelectedOpportunityId(oppId);
    setSteps([]);
    setError("");
    setRunning(true);

    try {
      const csrfToken = await getOrFetchCsrf();
      const res = await fetch("/api/automation/qualify-lead", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
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
              
            }
          }
        }
      }
      qc.invalidateQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow execution failed");
    } finally {
      setRunning(false);
    }
  }

  const selectedOpp = opportunities.data?.opportunities.find((o) => o.id === selectedOpportunityId);

  return (
    <div className="space-y-6 animate-fade-in">
      {}
      <div className="border-b border-subtle pb-4">
        <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
          <Workflow size={20} className="text-secondary" />
          Workflow Automation
        </h1>
        <p className="mt-1 text-xs text-secondary">
          Pipeline orchestration: Lead → AI Qualification → WhatsApp Outreach → Task Creation → Audit Logging
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Config panel */}
        <div className="card space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              Run Lead Qualification
            </h3>

            {}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">
                Select CRM Opportunity
              </label>
              <select
                className="field text-xs"
                value={selectedOpportunityId ?? ""}
                onChange={(e) => setSelectedOpportunityId(e.target.value || undefined)}
              >
                <option value="">Select an opportunity...</option>
                {opportunities.data?.opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} ({o.stage.toUpperCase()}) — ${Number(o.value).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {selectedOpp && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl p-3.5 bg-tertiary border border-subtle"
              >
                <p className="text-xs font-semibold text-primary">{selectedOpp.title}</p>
                <p className="text-[10px] text-secondary mt-1 font-mono">
                  Stage: {selectedOpp.stage.toUpperCase()} • Value: ${Number(selectedOpp.value).toLocaleString()}
                </p>
              </motion.div>
            )}

            {}
            <div className="space-y-2.5 pt-3 border-t border-subtle">
              <p className="text-[9px] font-bold uppercase tracking-wider text-tertiary">Automated Chain Steps</p>
              {[
                "Fetch target opportunity details from database",
                "Execute Gemini LLM evaluation (score 0-100)",
                "For score > 80, dispatch WhatsApp Outreach",
                "Insert persistent follow-up task in CRM",
                "Log step results securely in tenant Audit Logs",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-[10px] font-bold font-mono mt-0.5 text-primary" style={{ color: "var(--accent-primary)" }}>{i + 1}</span>
                  <span className="text-xs text-secondary leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary w-full py-2.5 text-xs font-semibold"
            onClick={runQualifyLead}
            disabled={running || !opportunities.data?.opportunities.length}
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? "Executing automation..." : "Run Qualify Lead Chain"}
          </button>
        </div>

        {/* Execution results */}
        <div className="card-glass flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 pb-2 border-b border-subtle">
            Orchestration Timeline
          </h3>

          {error && (
            <div className="rounded-xl p-3.5 mb-4 flex items-start gap-3 bg-danger-bg border border-danger/15 animate-fade-in">
              <AlertCircle size={15} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs text-danger leading-relaxed">{error}</p>
            </div>
          )}

          {steps.length === 0 && !running ? (
            <div className="empty-state flex-1 flex flex-col justify-center py-20">
              <Workflow size={36} className="text-tertiary mb-2" />
              <p className="text-xs">Trigger the qualify lead workflow to trace real-time orchestration logs here</p>
            </div>
          ) : (
            <div className="space-y-0 pr-1 overflow-y-auto flex-1">
              <AnimatePresence>
                {steps.map((s, i) => {
                  const meta = STEP_META[s.step] ?? { label: s.step, icon: CheckCircle2, color: "var(--text-secondary)" };
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.1 }}
                      className="workflow-step"
                    >
                      <div className="workflow-step-dot complete" style={{ borderColor: meta.color, background: `${meta.color}10`, color: meta.color }}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0 bg-tertiary border border-subtle rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-primary">{meta.label}</p>
                          <span className="text-[10px] text-tertiary font-mono">
                            {s.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                        <pre
                          className="mt-2 rounded-lg bg-primary border border-subtle p-2.5 text-[10px] font-mono leading-relaxed"
                          style={{
                            color: "var(--text-secondary)",
                            maxHeight: "120px",
                            overflowY: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                          }}
                        >
                          {JSON.stringify(s.payload, null, 2)}
                        </pre>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {running && (
                <div className="workflow-step">
                  <div className="workflow-step-dot active">
                    <Loader2 size={14} className="animate-spin text-primary" style={{ color: "var(--accent-primary)" }} />
                  </div>
                  <div className="flex-1 bg-tertiary border border-subtle rounded-xl p-3 animate-pulse">
                    <p className="text-xs font-medium text-secondary">Awaiting next automated step response...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
