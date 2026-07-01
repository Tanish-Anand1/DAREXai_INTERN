"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Wrench, Sparkles, MessageSquare, Plus } from "lucide-react";

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolName?: string;
  toolResult?: unknown;
  timestamp: Date;
};

function getCsrf(): string {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("darex_csrf="))
    ?.split("=")[1] ?? "";
}

export default function AgentPage() {
  const { data: session } = useSession();
  
  // Conversations sidebar state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(undefined);
  
  // Active conversation message log
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentTool, setCurrentTool] = useState<{ name: string; args?: any; result?: any } | null>(null);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations list on mount
  useEffect(() => {
    if (!session?.user?.tenantId) return;
    fetchConversations();
  }, [session?.user?.tenantId]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    fetchMessages(activeConvId);
  }, [activeConvId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, currentTool]);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/agent/chat");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setConversations(data.conversations || []);
      // Auto-activate first conversation if none is active
      if (data.conversations?.length && !activeConvId) {
        setActiveConvId(data.conversations[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  }

  async function fetchMessages(convId: string) {
    try {
      const res = await fetch(`/api/agent/chat?conversationId=${convId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages(
        (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolName: m.toolName || undefined,
          toolResult: m.toolPayload || undefined,
          timestamp: new Date(m.createdAt),
        }))
      );
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  }

  function startNewChat() {
    setActiveConvId(undefined);
    setMessages([]);
    setError("");
    setCurrentTool(null);
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsgText = input.trim();
    
    // Add user message locally
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMsgText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setError("");
    setCurrentTool(null);

    // Placeholder AI reply container
    const aiMsgId = `ai-${Date.now()}`;
    const aiMsg: Message = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": decodeURIComponent(getCsrf()),
        },
        body: JSON.stringify({
          message: userMsgText,
          conversationId: activeConvId,
        }),
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
        const text = decoder.decode(value);

        for (const line of text.split("\n")) {
          if (line.startsWith("event: tool")) {
            try {
              const data = JSON.parse(line.slice(12));
              setCurrentTool({ name: data.name, args: data.args });
            } catch {}
          }
          else if (line.startsWith("event: tool_result")) {
            try {
              const data = JSON.parse(line.slice(19));
              setCurrentTool((prev) => prev ? { ...prev, result: data.result } : null);
              
              // Attach tool info directly to the assistant bubble
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, toolName: data.name, toolResult: data.result } : m
                )
              );
            } catch {}
          }
          else if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.chunk) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId ? { ...m, content: m.content + payload.chunk } : m
                  )
                );
              }
              if (payload.error) {
                setError(payload.error);
              }
            } catch {}
          }
        }
      }

      // Refresh side menu for newly created chats
      fetchConversations();
    } catch (err) {
      console.error("Agent chat failed", err);
      setError(err instanceof Error ? err.message : "Agent request failed");
    } finally {
      setStreaming(false);
      setCurrentTool(null);
    }
  }

  const suggestions = [
    "Show pipeline metrics and create a follow-up task",
    "Search contacts for Aarav Mehta",
    "What are the active opportunities?",
    "Create a follow-up reminder for tomorrow",
  ];

  return (
    <div className="flex animate-fade-in gap-5" style={{ height: "calc(100vh - 48px)" }}>
      
      {/* 1. Minimal Sidebar for Past Conversations */}
      <div className="w-64 flex flex-col bg-secondary border border-subtle rounded-lg p-3 space-y-3">
        <button
          className="btn btn-secondary w-full justify-start text-xs font-semibold py-2"
          onClick={startNewChat}
        >
          <Plus size={14} /> New Conversation
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider px-2" style={{ color: "var(--text-tertiary)" }}>
            History
          </p>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className="w-full text-left text-xs rounded-md p-2 transition-all flex items-center gap-2 truncate"
              style={{
                background: activeConvId === c.id ? "var(--bg-tertiary)" : "transparent",
                color: activeConvId === c.id ? "var(--text-primary)" : "var(--text-secondary)",
                border: activeConvId === c.id ? "1px solid var(--border-default)" : "1px solid transparent",
              }}
            >
              <MessageSquare size={12} className="opacity-70 flex-shrink-0" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-center text-[11px] py-4" style={{ color: "var(--text-tertiary)" }}>
              No past chats.
            </p>
          )}
        </div>
      </div>

      {/* 2. Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-secondary border border-subtle rounded-lg overflow-hidden relative">
        
        {/* Messages list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center p-6">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-default)" }}
              >
                <Bot size={22} style={{ color: "var(--text-secondary)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  AI Operations Assistant
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                  Ask questions or trigger actions naturally. History is fully persistent.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-md pt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    className="btn btn-secondary text-[11px] py-1.5 px-3"
                    onClick={() => setInput(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
              >
                <div className="flex gap-3 max-w-[85%]">
                  {msg.role === "assistant" && (
                    <div
                      className="flex h-7 w-7 min-w-[28px] items-center justify-center rounded-lg mt-0.5"
                      style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-default)" }}
                    >
                      <Bot size={14} style={{ color: "var(--text-secondary)" }} />
                    </div>
                  )}
                  <div>
                    {/* Tool Call Log Block */}
                    {msg.toolName && (
                      <div
                        className="mb-2 rounded-md px-2.5 py-1.5 flex flex-col gap-1 text-[11px]"
                        style={{
                          background: "var(--bg-tertiary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                          <Wrench size={11} />
                          <span className="font-semibold">Tool call:</span>
                          <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent-primary)" }}>{msg.toolName}</code>
                        </div>
                        {!!msg.toolResult && (
                          <pre
                            className="text-[10px] mt-1 p-2 rounded max-h-24 overflow-y-auto"
                            style={{
                              background: "var(--bg-primary)",
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {JSON.stringify(msg.toolResult, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div
                      className={`chat-bubble ${
                        msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"
                      }`}
                      style={{
                        background: msg.role === "user" ? "var(--bg-surface)" : "var(--bg-tertiary)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                        boxShadow: "none"
                      }}
                    >
                      {msg.content || (
                        <div className="flex gap-1 py-1">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      )}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div
                      className="flex h-7 w-7 min-w-[28px] items-center justify-center rounded-lg mt-0.5"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
                    >
                      <User size={14} style={{ color: "var(--text-secondary)" }} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Live streaming tool progress bar */}
          {currentTool && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex gap-3 max-w-[85%] items-start">
                <div
                  className="flex h-7 w-7 min-w-[28px] items-center justify-center rounded-lg"
                  style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-default)" }}
                >
                  <Loader2 size={13} className="animate-spin text-tertiary" />
                </div>
                <div
                  className="rounded-md px-2.5 py-1.5 text-[11px]"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                    <Wrench size={11} /> Running tool: <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent-primary)" }}>{currentTool.name}</code>
                  </span>
                  {currentTool.args && (
                    <pre className="text-[10px] mt-1 p-1 px-2 rounded" style={{ background: "var(--bg-primary)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      Arguments: {JSON.stringify(currentTool.args)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div
            className="mx-4 mb-2 rounded-md px-3 py-2 text-xs"
            style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            {error}
          </div>
        )}

        {/* Input Form */}
        <div className="p-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <input
              className="field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message your operations agent..."
              disabled={streaming}
              style={{ padding: "8px 12px", fontSize: "0.8125rem" }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!input.trim() || streaming}
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-primary)", padding: "8px 14px" }}
            >
              {streaming ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
