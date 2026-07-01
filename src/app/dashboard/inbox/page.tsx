"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Inbox as InboxIcon, MessageSquare, Mail, Phone, ArrowDownLeft, ArrowUpRight,
  Sparkles,
} from "lucide-react";

type InboxMessage = {
  id: string;
  type: "whatsapp" | "email" | "call";
  direction: "inbound" | "outbound";
  body: string;
  sentiment: string;
  intent: string;
  summary: string;
  recommendedAction: string;
  contact?: { name: string; company?: string };
  createdAt: string;
};

const TYPE_ICONS = {
  whatsapp: MessageSquare,
  email: Mail,
  call: Phone,
};

const TYPE_COLORS = {
  whatsapp: "var(--success)",
  email: "var(--info)",
  call: "var(--warning)",
};

const SENTIMENT_BADGE: Record<string, string> = {
  positive: "badge-success",
  neutral: "badge-neutral",
  negative: "badge-danger",
};

const INTENT_BADGE: Record<string, string> = {
  purchase: "badge-success",
  inquiry: "badge-info",
  followup: "badge-accent",
  complaint: "badge-danger",
};

export default function InboxPage() {
  const { data: session } = useSession();
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const inbox = useQuery({
    queryKey: ["inbox"],
    queryFn: async () => {
      const res = await fetch("/api/inbox");
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ messages: InboxMessage[] }>;
    },
    enabled: Boolean(session?.user?.tenantId),
  });

  const filtered = (inbox.data?.messages ?? []).filter(
    (m) => filter === "all" || m.type === filter,
  );

  return (
    <div className="animate-fade-in" style={{ height: "calc(100vh - 48px)" }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <InboxIcon size={24} style={{ color: "var(--accent-primary)" }} />
          Unified Inbox
        </h1>
        <p className="mt-1" style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
          WhatsApp, Email, and Call logs with AI analysis
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: "All" },
          { key: "whatsapp", label: "WhatsApp" },
          { key: "email", label: "Email" },
          { key: "call", label: "Calls" },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`btn ${filter === key ? "btn-primary" : "btn-ghost"}`}
            style={{ padding: "6px 14px", fontSize: "0.8125rem" }}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Split view */}
      <div className="flex gap-4" style={{ height: "calc(100% - 120px)" }}>
        {/* Message list */}
        <div className="card flex-1 overflow-y-auto" style={{ padding: 0, maxWidth: "480px" }}>
          {inbox.isLoading ? (
            <div className="empty-state">
              <div className="h-4 w-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--accent-primary)" }} />
            </div>
          ) : filtered.length ? (
            filtered.map((msg) => {
              const Icon = TYPE_ICONS[msg.type];
              return (
                <button
                  key={msg.id}
                  className="w-full text-left p-4 transition-colors"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: selected?.id === msg.id ? "var(--bg-tertiary)" : "transparent",
                  }}
                  onClick={() => setSelected(msg)}
                  onMouseEnter={(e) => { if (selected?.id !== msg.id) e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                  onMouseLeave={(e) => { if (selected?.id !== msg.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 min-w-[36px] items-center justify-center rounded-lg mt-0.5"
                      style={{ background: `${TYPE_COLORS[msg.type]}15`, color: TYPE_COLORS[msg.type] }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {msg.contact?.name ?? "Unknown"}
                        </span>
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                        {msg.direction === "inbound" ? (
                          <ArrowDownLeft size={10} className="inline mr-1" />
                        ) : (
                          <ArrowUpRight size={10} className="inline mr-1" />
                        )}
                        {msg.body.slice(0, 80)}
                      </p>
                      <div className="flex gap-1.5 mt-2">
                        <span className={`badge ${SENTIMENT_BADGE[msg.sentiment] ?? "badge-neutral"}`}>{msg.sentiment}</span>
                        <span className={`badge ${INTENT_BADGE[msg.intent] ?? "badge-neutral"}`}>{msg.intent}</span>
                      </div>
                      <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                        <Sparkles size={8} className="text-secondary" />
                        <span className="truncate">Action: {msg.recommendedAction}</span>
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="empty-state">
              <p>No messages in inbox</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="card flex-1 overflow-y-auto" style={{ minWidth: 0 }}>
          {selected ? (
            <div className="animate-fade-in space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selected.contact?.name ?? "Unknown Contact"}
                  </h3>
                  {selected.contact?.company && (
                    <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{selected.contact.company}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="badge"
                    style={{
                      background: `${TYPE_COLORS[selected.type]}15`,
                      color: TYPE_COLORS[selected.type],
                      border: `1px solid ${TYPE_COLORS[selected.type]}30`,
                    }}
                  >
                    {selected.type}
                  </span>
                  <span className="badge badge-neutral">
                    {selected.direction === "inbound" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                    {selected.direction}
                  </span>
                </div>
              </div>

              {/* Message body */}
              <div className="rounded-lg p-4" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{selected.body}</p>
              </div>

              {/* AI Analysis */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Sparkles size={14} style={{ color: "var(--accent-primary)" }} />
                  AI Analysis
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg p-3" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Sentiment</p>
                    <span className={`badge ${SENTIMENT_BADGE[selected.sentiment] ?? "badge-neutral"}`}>{selected.sentiment}</span>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Intent</p>
                    <span className={`badge ${INTENT_BADGE[selected.intent] ?? "badge-neutral"}`}>{selected.intent}</span>
                  </div>
                </div>

                <div className="rounded-lg p-3" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>AI Summary</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{selected.summary}</p>
                </div>

                <div className="rounded-lg p-3" style={{ background: "var(--accent-glow)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--accent-primary)" }}>Recommended Action</p>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>{selected.recommendedAction}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state h-full">
              <InboxIcon size={40} />
              <p>Select a message to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
