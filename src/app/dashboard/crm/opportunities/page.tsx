"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BriefcaseBusiness, Plus, X, DollarSign, Sparkles, Loader2,
} from "lucide-react";
import { useUiStore } from "@/store/ui";

type Opportunity = {
  id: string;
  title: string;
  value: string;
  stage: string;
  qualificationScore?: number;
  nextBestAction?: string;
  contact?: { name: string };
  createdAt: string;
};

const STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
const STAGE_COLORS: Record<string, string> = {
  new: "var(--info)",
  qualified: "var(--accent-primary)",
  proposal: "var(--accent-secondary)",
  negotiation: "var(--warning)",
  won: "var(--success)",
  lost: "var(--danger)",
};

function getCsrf() {
  return decodeURIComponent(
    document.cookie.split("; ").find((r) => r.startsWith("darex_csrf="))?.split("=")[1] ?? ""
  );
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function OpportunitiesPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const { selectedOpportunityId, setSelectedOpportunityId } = useUiStore();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", value: "0", stage: "new", contactId: "" });
  const [nbaLoading, setNbaLoading] = useState<string | null>(null);
  const [nbas, setNbas] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  const opportunities = useQuery({
    queryKey: ["opportunities"],
    queryFn: () => api<{ opportunities: Opportunity[] }>("/api/crm/opportunities"),
    enabled: Boolean(session?.user?.tenantId),
  });

  const contacts = useQuery({
    queryKey: ["contacts"],
    queryFn: () => api<{ contacts: Array<{ id: string; name: string }> }>("/api/crm/contacts"),
    enabled: Boolean(session?.user?.tenantId),
  });

  const createOpp = useMutation({
    mutationFn: () => api("/api/crm/opportunities", { method: "POST", body: JSON.stringify({ ...form, value: Number(form.value) }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      setModal(false);
      setForm({ title: "", value: "0", stage: "new", contactId: "" });
      showToast("Opportunity created");
    },
  });

  async function fetchNba(id: string) {
    setNbaLoading(id);
    try {
      const res = await api<{ nextBestAction: string }>(`/api/crm/opportunities/${id}/next-best-action`, {
        method: "POST",
        body: JSON.stringify({ regenerate: true }),
      });
      setNbas((prev) => ({ ...prev, [id]: res.nextBestAction }));
    } catch (err) {
      console.error("NBA failed", err);
    } finally {
      setNbaLoading(null);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Group opportunities by stage for kanban view
  const grouped = STAGES.reduce<Record<string, Opportunity[]>>((acc, stage) => {
    acc[stage] = (opportunities.data?.opportunities ?? []).filter((o) => o.stage === stage);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-subtle pb-4">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <BriefcaseBusiness size={20} className="text-secondary" />
            Opportunities
          </h1>
          <p className="text-xs text-secondary mt-1">
            Pipeline management with automated insights
          </p>
        </div>
        <button className="btn btn-primary text-xs py-2 px-3" onClick={() => setModal(true)}>
          <Plus size={14} /> New Opportunity
        </button>
      </div>

      {/* Pipeline Board with Column transitions */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[460px]">
        {STAGES.filter((s) => s !== "lost").map((stage, colIdx) => (
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: colIdx * 0.05 }}
            className="pipeline-column min-w-[240px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  {stage}
                </h3>
              </div>
              <span className="badge text-[10px] px-2 py-0.5">
                {grouped[stage]?.length ?? 0}
              </span>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {grouped[stage]?.map((opp) => (
                  <motion.div
                    key={opp.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    whileHover={{ y: -1 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="pipeline-card relative hover:bg-elevated transition-colors cursor-pointer"
                    onClick={() => setSelectedOpportunityId(opp.id)}
                    style={selectedOpportunityId === opp.id ? { borderColor: "var(--border-strong)" } : {}}
                  >
                    <p className="text-xs font-semibold text-primary mb-1">{opp.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="flex items-center text-[10px] font-semibold text-success font-mono">
                        <DollarSign size={10} />
                        {Number(opp.value).toLocaleString()}
                      </span>
                      {opp.contact && (
                        <span className="text-[10px] text-tertiary">
                          {opp.contact.name}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <Link
                        href={`/dashboard/crm/opportunities/${opp.id}`}
                        className="text-[9px] hover:underline"
                        style={{ color: "var(--text-secondary)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Details →
                      </Link>
                    </div>

                    {opp.qualificationScore != null && (
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="text-tertiary">Score</span>
                          <span className="font-semibold text-secondary">{opp.qualificationScore}%</span>
                        </div>
                        <div className="w-full h-1 bg-primary rounded overflow-hidden">
                          <div
                            className="h-full rounded transition-all"
                            style={{
                              width: `${opp.qualificationScore}%`,
                              background: opp.qualificationScore > 80 ? "var(--success)" : "var(--text-secondary)",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Next best action tool */}
                    <div className="mt-3">
                      {nbas[opp.id] ? (
                        <p className="text-[10px] leading-relaxed text-secondary italic">
                          {nbas[opp.id].slice(0, 110)}...
                        </p>
                      ) : (
                        <button
                          className="btn btn-secondary w-full text-[9px]"
                          style={{ padding: "4px 8px" }}
                          onClick={(e) => { e.stopPropagation(); fetchNba(opp.id); }}
                          disabled={nbaLoading === opp.id}
                        >
                          {nbaLoading === opp.id ? <Loader2 size={10} className="animate-spin text-tertiary" /> : <Sparkles size={10} />}
                          AI Next Best Action
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Animated Modal Dialog */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={() => setModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">New Opportunity</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}><X size={16} /></button>
              </div>
              <form className="space-y-4 text-xs" onSubmit={(e) => { e.preventDefault(); createOpp.mutate(); }}>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">Title *</label>
                  <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">Value ($)</label>
                    <input className="field" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">Stage</label>
                    <select className="field" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                      {STAGES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">Contact</label>
                  <select className="field" value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                    <option value="">None</option>
                    {contacts.data?.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" className="btn btn-secondary text-xs" onClick={() => setModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary text-xs" disabled={!form.title.trim() || createOpp.isPending}>Create</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="toast"
          >
            <span style={{ color: "var(--success)" }}>✓</span>
            <span className="text-xs text-primary">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
