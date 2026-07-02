"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Inbox as InboxIcon, MessageSquare, Mail, Phone, ArrowDownLeft, ArrowUpRight,
  Sparkles, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getOrFetchCsrf } from "@/lib/client-api";

type InboxMessage = {
  id: string;
  type: "whatsapp" | "email" | "call";
  direction: "inbound" | "outbound";
  body: string;
  sentiment: string;
  intent: string;
  summary: string;
  recommendedAction: string;
  contact?: { id: string; name: string; company?: string };
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

  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState(false);

  async function handleSendReply() {
    if (!selected?.contact?.id || !replyText.trim()) return;
    setSendingReply(true);
    setReplyError("");
    setReplySuccess(false);
    try {
      const csrfToken = await getOrFetchCsrf();
      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          contactId: selected.contact.id,
          body: replyText,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setReplyText("");
      setReplySuccess(true);
      inbox.refetch();
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  }

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
    <div className="animate-fade-in space-y-6" style={{ height: "calc(100vh - 48px)" }}>
      {}
      <div className="border-b border-subtle pb-4">
        <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
          <InboxIcon size={20} className="text-secondary" />
          Unified Inbox
        </h1>
        <p className="mt-1 text-xs text-secondary">
          WhatsApp, Email, and Call logs with automated AI insights
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {[
          { key: "all", label: "All Logs" },
          { key: "whatsapp", label: "WhatsApp" },
          { key: "email", label: "Email" },
          { key: "call", label: "Voice Calls" },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`btn ${filter === key ? "btn-primary" : "btn-secondary"} text-xs py-1.5 px-3`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Split view */}
      <div className="flex gap-4" style={{ height: "calc(100% - 130px)" }}>
        {/* Message list */}
        <div className="card flex-1 overflow-y-auto" style={{ padding: 0, maxWidth: "420px" }}>
          {inbox.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={16} className="animate-spin text-primary" style={{ color: "var(--accent-primary)" }} />
            </div>
          ) : filtered.length ? (
            <div className="divide-y divide-subtle">
              {filtered.map((msg, i) => {
                const Icon = TYPE_ICONS[msg.type];
                return (
                  <motion.button
                    key={msg.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="w-full text-left p-3.5 transition-colors relative"
                    style={{
                      background: selected?.id === msg.id ? "var(--bg-tertiary)" : "transparent",
                    }}
                    onClick={() => {
                      setSelected(msg);
                      setReplyText("");
                      setReplyError("");
                      setReplySuccess(false);
                    }}
                  >
                    {selected?.id === msg.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" style={{ background: "var(--accent-gradient)" }} />
                    )}
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-lg mt-0.5"
                        style={{ background: `${TYPE_COLORS[msg.type]}12`, color: TYPE_COLORS[msg.type] }}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-primary truncate">
                            {msg.contact?.name ?? "Unknown Sender"}
                          </span>
                          <span className="text-[10px] text-tertiary flex-shrink-0 font-mono">
                            {new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-[11px] mt-1 text-secondary truncate">
                          {msg.direction === "inbound" ? (
                            <ArrowDownLeft size={10} className="inline mr-1 text-success" />
                          ) : (
                            <ArrowUpRight size={10} className="inline mr-1 text-info" />
                          )}
                          {msg.body}
                        </p>
                        <div className="flex gap-1.5 mt-2">
                          <span className={`badge text-[9px] px-2 ${SENTIMENT_BADGE[msg.sentiment] ?? "badge-neutral"}`}>{msg.sentiment}</span>
                          <span className={`badge text-[9px] px-2 ${INTENT_BADGE[msg.intent] ?? "badge-neutral"}`}>{msg.intent}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state py-12">
              <InboxIcon size={32} className="text-tertiary" />
              <p className="text-xs">No communications logs found</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="card-glass flex-1 overflow-y-auto" style={{ minWidth: 0, padding: "20px" }}>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-subtle pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-primary">
                      {selected.contact?.name ?? "Unknown Sender"}
                    </h3>
                    {selected.contact?.company && (
                      <p className="text-xs text-tertiary mt-0.5">{selected.contact.company}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="badge text-[10px] font-semibold"
                      style={{
                        background: `${TYPE_COLORS[selected.type]}12`,
                        color: TYPE_COLORS[selected.type],
                        borderColor: `${TYPE_COLORS[selected.type]}25`,
                      }}
                    >
                      {selected.type.toUpperCase()}
                    </span>
                    <span className="badge badge-accent text-[10px] font-semibold uppercase">
                      {selected.direction}
                    </span>
                  </div>
                </div>

                {}
                <div className="rounded-xl p-4 bg-tertiary border border-subtle">
                  <p className="text-xs leading-relaxed text-secondary whitespace-pre-wrap">{selected.body}</p>
                </div>

                {}
                <div className="space-y-3.5 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Sparkles size={13} className="text-primary" style={{ color: "var(--accent-primary)" }} />
                    AI Assessment Summary
                  </h4>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg p-3 bg-tertiary border border-subtle">
                      <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider mb-1">Sentiment</p>
                      <span className={`badge text-[10px] px-2.5 font-bold ${SENTIMENT_BADGE[selected.sentiment ?? ""] ?? "badge-neutral"}`}>{(selected.sentiment ?? "neutral").toUpperCase()}</span>
                    </div>
                    <div className="rounded-lg p-3 bg-tertiary border border-subtle">
                      <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider mb-1">Intent Category</p>
                      <span className={`badge text-[10px] px-2.5 font-bold ${INTENT_BADGE[selected.intent ?? ""] ?? "badge-neutral"}`}>{(selected.intent ?? "inquiry").toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="rounded-lg p-3 bg-tertiary border border-subtle space-y-1">
                    <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">AI Summary</p>
                    <p className="text-xs leading-relaxed text-secondary">{selected.summary}</p>
                  </div>

                  <div className="rounded-lg p-3 border space-y-1" style={{ background: "rgba(139, 92, 246, 0.04)", borderColor: "rgba(139, 92, 246, 0.15)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent-primary)" }}>Recommended Follow-up</p>
                    <p className="text-xs leading-relaxed text-primary font-medium">{selected.recommendedAction}</p>
                  </div>

                  {selected.type === "whatsapp" && selected.contact?.id && (
                    <div className="border-t border-subtle pt-4 mt-4 space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Quick Reply via WhatsApp</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="field flex-1 text-xs"
                          placeholder="Type message body..."
                          value={replyText}
                          onChange={(e) => {
                            setReplyText(e.target.value);
                            if (replySuccess) setReplySuccess(false);
                            if (replyError) setReplyError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && replyText.trim() && !sendingReply) {
                              handleSendReply();
                            }
                          }}
                          disabled={sendingReply}
                        />
                        <button
                          className="btn btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
                          onClick={handleSendReply}
                          disabled={sendingReply || !replyText.trim()}
                        >
                          {sendingReply ? <Loader2 size={12} className="animate-spin" /> : "Send"}
                        </button>
                      </div>
                      {replyError && <p className="text-[10px] text-danger">{replyError}</p>}
                      {replySuccess && <p className="text-[10px] text-success">✓ Reply successfully sent and registered in DB.</p>}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="empty-state h-full flex flex-col justify-center py-12">
                <InboxIcon size={36} className="text-tertiary mb-2" />
                <p className="text-xs">Select a contact log from the inbox list to view analysis details</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
