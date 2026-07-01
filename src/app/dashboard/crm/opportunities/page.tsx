"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BriefcaseBusiness, Plus, X, DollarSign, Sparkles, Loader2, Target, Search
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
  proposal: "#8b5cf6",
  negotiation: "var(--warning)",
  won: "var(--success)",
  lost: "var(--danger)",
};

import { clientFetch } from "@/lib/client-api";

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
    queryFn: () => clientFetch<{ opportunities: Opportunity[] }>("/api/crm/opportunities"),
    enabled: Boolean(session?.user?.tenantId),
  });

  const contacts = useQuery({
    queryKey: ["contacts"],
    queryFn: () => clientFetch<{ contacts: Array<{ id: string; name: string }> }>("/api/crm/contacts"),
    enabled: Boolean(session?.user?.tenantId),
  });

  const createOpp = useMutation({
    mutationFn: () => clientFetch("/api/crm/opportunities", { method: "POST", body: JSON.stringify({ ...form, value: Number(form.value) }) }),
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
      const res = await clientFetch<{ nextBestAction: string }>(`/api/crm/opportunities/${id}/next-best-action`, {
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

  const [searchQuery, setSearchQuery] = useState("");

  const grouped = STAGES.reduce<Record<string, Opportunity[]>>((acc, stage) => {
    acc[stage] = (opportunities.data?.opportunities ?? []).filter((o) => {
      if (o.stage !== stage) return false;
      const q = searchQuery.toLowerCase();
      return o.title.toLowerCase().includes(q) ||
             (o.contact?.name ?? "").toLowerCase().includes(q);
    });
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
        <button className="btn btn-primary text-xs py-2 px-3 animate-pulse-glow" onClick={() => setModal(true)}>
          <Plus size={14} /> New Opportunity
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
        <input
          className="field text-xs"
          style={{ paddingLeft: "36px" }}
          placeholder="Search opportunities by title or contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[460px] -mx-4 px-4 sm:-mx-6 sm:px-6">
        {STAGES.filter((s) => s !== "lost").map((stage, colIdx) => (
          <motion.div
            key={stage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
            className="flex flex-col gap-3 min-w-[270px] bg-secondary/30 border border-default p-4 rounded-xl shrink-0"
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-default">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {stage.toLowerCase()}
                </h3>
              </div>
              <span className="badge text-[10px] font-semibold px-2 py-0.5">
                {grouped[stage]?.length ?? 0}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <AnimatePresence>
                {grouped[stage]?.map((opp) => (
                  <motion.div
                    key={opp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="card relative hover:border-strong transition-colors cursor-pointer"
                    onClick={() => setSelectedOpportunityId(opp.id)}
                    style={selectedOpportunityId === opp.id ? { borderColor: "var(--text-primary)", borderWidth: "1.5px" } : {}}
                  >
                    <p className="text-xs font-semibold text-primary mb-1">{opp.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="flex items-center text-[10px] font-semibold text-success font-mono">
                        <DollarSign size={10} />
                        {Number(opp.value).toLocaleString()}
                      </span>
                      {opp.contact && (
                        <span className="text-[9px] text-tertiary font-medium">
                          {opp.contact.name}
                        </span>
                      )}
                    </div>
                    
                    {opp.qualificationScore != null && (
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="text-tertiary flex items-center gap-0.5"><Target size={10} /> Qual Score</span>
                          <span className="font-semibold text-secondary">{opp.qualificationScore}%</span>
                        </div>
                        <div className="w-full h-1 bg-primary rounded overflow-hidden">
                          <div
                            className="h-full rounded transition-all"
                            style={{
                              width: `${opp.qualificationScore}%`,
                              background: opp.qualificationScore > 80 ? "var(--success)" : "var(--accent-primary)",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Next best action tool */}
                    <div className="mt-3">
                      {nbas[opp.id] ? (
                        <p className="text-[10px] leading-relaxed text-secondary italic bg-primary border border-subtle p-2 rounded-lg">
                          {nbas[opp.id].slice(0, 110)}...
                        </p>
                      ) : (
                        <button
                          className="btn btn-secondary w-full text-[9px]"
                          style={{ padding: "4.5px 8px" }}
                          onClick={(e) => { e.stopPropagation(); fetchNba(opp.id); }}
                          disabled={nbaLoading === opp.id}
                        >
                          {nbaLoading === opp.id ? <Loader2 size={10} className="animate-spin text-tertiary" /> : <Sparkles size={10} className="text-primary" style={{ color: "var(--accent-primary)" }} />}
                          AI Next Best Action
                        </button>
                      )}
                    </div>

                    <div className="flex justify-end mt-2 pt-2 border-t border-subtle">
                      <Link
                        href={`/dashboard/crm/opportunities/${opp.id}`}
                        className="text-[9px] text-secondary hover:text-primary transition-colors hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Opportunity Details →
                      </Link>
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
                <h3 className="modal-title font-bold gradient-text">New Opportunity</h3>
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
                  <button type="submit" className="btn btn-primary text-xs" disabled={!form.title.trim() || createOpp.isPending}>Create Opportunity</button>
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
