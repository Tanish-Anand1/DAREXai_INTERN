"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness, ArrowLeft, DollarSign, Sparkles, Loader2,
  Calendar, CheckSquare, MessageSquare, ShieldCheck, Mail, Phone, Building2
} from "lucide-react";

type Contact = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
};

type Task = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
};

type AuditLog = {
  id: string;
  action: string;
  createdAt: string;
};

type Message = {
  id: string;
  type: string;
  direction: string;
  body: string;
  createdAt: string;
};

type OpportunityDetailResponse = {
  opportunity: {
    id: string;
    title: string;
    value: string;
    stage: string;
    qualificationScore?: number;
    nextBestAction?: string;
    contact?: Contact;
    tasks: Task[];
  };
  auditLogs: AuditLog[];
  messages: Message[];
};

import { clientFetch, getOrFetchCsrf } from "@/lib/client-api";

async function fetchOpportunityDetail(id: string): Promise<OpportunityDetailResponse> {
  return clientFetch(`/api/crm/opportunities/${id}`);
}

export default function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [nbaLoading, setNbaLoading] = useState(false);
  const [toast, setToast] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["opportunity-detail", params.id],
    queryFn: () => fetchOpportunityDetail(params.id),
    enabled: Boolean(session?.user?.tenantId && params.id),
  });

  const updateStage = useMutation({
    mutationFn: async (newStage: string) => {
      const csrfToken = await getOrFetchCsrf();
      const res = await fetch(`/api/crm/opportunities/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to update stage");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunity-detail", params.id] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      showToast("Stage updated successfully");
    },
  });

  async function fetchNba() {
    setNbaLoading(true);
    try {
      const csrfToken = await getOrFetchCsrf();
      const res = await fetch(`/api/crm/opportunities/${params.id}/next-best-action`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ regenerate: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      qc.invalidateQueries({ queryKey: ["opportunity-detail", params.id] });
      showToast("AI Next Best Action updated");
    } catch (err) {
      console.error("NBA failed", err);
    } finally {
      setNbaLoading(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-tertiary" size={24} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card text-center p-8">
        <p className="text-sm text-danger">Opportunity not found or access denied.</p>
        <Link href="/dashboard/crm/opportunities" className="btn btn-secondary mt-4">
          Back to Opportunities
        </Link>
      </div>
    );
  }

  const { opportunity, auditLogs, messages } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with back button */}
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/crm/opportunities" className="btn btn-secondary btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <BriefcaseBusiness size={20} className="text-secondary" />
              {opportunity.title}
            </h1>
            <p className="text-xs text-secondary mt-1">Opportunity Detail View</p>
          </div>
        </div>
        
        {/* Stage Updater */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-tertiary">Stage:</span>
          <select
            className="field w-32 py-1 text-xs"
            value={opportunity.stage}
            onChange={(e) => updateStage.mutate(e.target.value)}
            disabled={updateStage.isPending}
          >
            {["new", "qualified", "proposal", "negotiation", "won", "lost"].map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Side: General Info & Related Activity */}
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="card grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs text-tertiary block">Deal Value</span>
              <span className="text-2xl font-bold text-success flex items-center mt-1">
                <DollarSign size={20} />
                {Number(opportunity.value).toLocaleString()}
              </span>
            </div>
            
            {/* Associated Contact Info */}
            <div>
              <span className="text-xs text-tertiary block">Associated Contact</span>
              {opportunity.contact ? (
                <div className="mt-1 space-y-1">
                  <p className="text-sm font-semibold text-primary">{opportunity.contact.name}</p>
                  <p className="text-xs text-secondary flex items-center gap-1.5">
                    <Building2 size={12} className="text-tertiary" /> {opportunity.contact.company ?? "No company"}
                  </p>
                  {opportunity.contact.email && (
                    <p className="text-xs text-secondary flex items-center gap-1.5">
                      <Mail size={12} className="text-tertiary" /> {opportunity.contact.email}
                    </p>
                  )}
                  {opportunity.contact.phone && (
                    <p className="text-xs text-secondary flex items-center gap-1.5">
                      <Phone size={12} className="text-tertiary" /> {opportunity.contact.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-secondary mt-1">No associated contact</p>
              )}
            </div>
          </div>

          {/* Related Activity Tabs */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              Related Activity Timeline
            </h3>

            {/* Related Tasks */}
            <div className="space-y-2 pt-2 border-t border-subtle">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <CheckSquare size={13} className="text-secondary" />
                Tasks ({opportunity.tasks.length})
              </span>
              {opportunity.tasks.length ? (
                <div className="space-y-1">
                  {opportunity.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded border border-subtle p-2 hover:bg-tertiary">
                      <span className="text-xs text-secondary">{task.title}</span>
                      <span className="badge text-[10px]">{task.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-tertiary pl-4">No tasks found</p>
              )}
            </div>

            {/* Related Messages */}
            <div className="space-y-2 pt-4 border-t border-subtle">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <MessageSquare size={13} className="text-secondary" />
                Contact Messages ({messages.length})
              </span>
              {messages.length ? (
                <div className="space-y-1">
                  {messages.map((msg) => (
                    <div key={msg.id} className="rounded border border-subtle p-2 hover:bg-tertiary">
                      <div className="flex justify-between items-center mb-1">
                        <span className="badge text-[9px] uppercase">{msg.type} • {msg.direction}</span>
                        <span className="text-[9px] text-tertiary font-mono">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-secondary">{msg.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-tertiary pl-4">No messages recorded</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: AI Score and Next Best Action */}
        <div className="space-y-6">
          {/* AI Score Card */}
          <div className="card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">AI Qualification Score</span>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-extrabold text-primary font-mono">
                {opportunity.qualificationScore != null ? `${opportunity.qualificationScore}%` : "—"}
              </span>
              <span className="text-xs text-success font-semibold">Active</span>
            </div>
            {opportunity.qualificationScore != null && (
              <div className="w-full h-1.5 bg-tertiary rounded overflow-hidden mt-1">
                <div
                  className="h-full"
                  style={{
                    width: `${opportunity.qualificationScore}%`,
                    background: opportunity.qualificationScore > 80 ? "var(--success)" : "var(--accent-primary)",
                  }}
                />
              </div>
            )}
          </div>

          {/* AI Next Best Action */}
          <div className="card space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              AI Next Best Action
            </span>
            <div className="rounded border border-subtle p-3 bg-tertiary text-xs text-secondary leading-relaxed min-h-[80px]">
              {opportunity.nextBestAction ? (
                <p>{opportunity.nextBestAction}</p>
              ) : (
                <p className="text-tertiary italic">No next best action suggested yet.</p>
              )}
            </div>
            <button
              className="btn btn-primary w-full py-2 text-xs"
              onClick={fetchNba}
              disabled={nbaLoading}
            >
              {nbaLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {opportunity.nextBestAction ? "Regenerate Recommendation" : "Generate Recommendation"}
            </button>
          </div>

          {/* Audit Logs */}
          <div className="card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" />
              Opportunity Audit Trail
            </span>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {auditLogs.length ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center rounded border border-subtle p-1.5 hover:bg-tertiary">
                    <span className="text-[10px] text-secondary truncate pr-2">{log.action}</span>
                    <span className="text-[9px] text-tertiary font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-tertiary text-center py-2">No audits recorded</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast">
          <span style={{ color: "var(--success)" }}>✓</span>
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
