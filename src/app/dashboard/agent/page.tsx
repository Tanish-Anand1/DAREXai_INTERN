"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Wrench, Sparkles, MessageSquare, Plus, ChevronDown, ChevronUp, History, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

import { getOrFetchCsrf } from "@/lib/client-api";

function ToolResultView({ name, result }: { name: string; result: any }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 rounded-lg border border-default bg-tertiary overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-2.5 hover:bg-tertiary/60 transition-colors text-left"
      >
        <span className="flex items-center gap-2 font-medium text-secondary">
          <Wrench size={13} className="text-primary" />
          Executed: <code className="text-[11px] font-mono text-primary">{name}</code>
        </span>
        {open ? <ChevronUp size={14} className="text-secondary" /> : <ChevronDown size={14} className="text-secondary" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <pre className="p-3 border-t border-default bg-primary overflow-x-auto text-[10px] font-mono leading-relaxed text-secondary">
              {JSON.stringify(result, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function renderMarkdown(content: string) {
  if (!content) return null;
  
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith("```")) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const code = match ? match[2] : part.slice(3, -3);
      return (
        <pre key={index} className="text-[10px] my-2 p-2.5 rounded bg-primary border border-default overflow-x-auto font-mono text-secondary">
          <code>{code}</code>
        </pre>
      );
    }
    
    const lines = part.split("\n");
    return (
      <div key={index}>
        {lines.map((line, lIdx) => {
          let cleanLine = line;
          const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
          
          if (isBullet) {
            cleanLine = line.trim().replace(/^[-*]\s+/, "");
          }
          
          const inlineParts = cleanLine.split(/(\*\*.*?\*\*|`.*?`)/g);
          const renderedLine = inlineParts.map((item, inlineIdx) => {
            if (item.startsWith("**") && item.endsWith("**")) {
              return <strong key={inlineIdx} className="text-primary font-semibold">{item.slice(2, -2)}</strong>;
            }
            if (item.startsWith("`") && item.endsWith("`")) {
              return <code key={inlineIdx} className="px-1.5 py-0.5 rounded bg-tertiary text-secondary text-[11px] font-mono">{item.slice(1, -1)}</code>;
            }
            return item;
          });
          
          if (isBullet) {
            return (
              <ul key={lIdx} className="list-disc pl-4 my-1">
                <li className="text-secondary text-xs">{renderedLine}</li>
              </ul>
            );
          }
          
          return line.trim() ? (
            <p key={lIdx} className="my-1.5 text-secondary leading-relaxed text-xs">{renderedLine}</p>
          ) : (
            <div key={lIdx} className="h-1" />
          );
        })}
      </div>
    );
  });
}

export default function AgentPage() {
  const { data: session } = useSession();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(undefined);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentTool, setCurrentTool] = useState<{ name: string; args?: any; result?: any } | null>(null);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [firstContactName, setFirstContactName] = useState("Aarav Mehta");

  useEffect(() => {
    if (!session?.user?.tenantId) return;
    fetch("/api/crm/contacts")
      .then((res) => res.json())
      .then((data) => {
        if (data.contacts && data.contacts.length > 0) {
          setFirstContactName(data.contacts[0].name);
        }
      })
      .catch(() => {});
  }, [session?.user?.tenantId]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!session?.user?.tenantId) return;
    fetchConversations();
  }, [session?.user?.tenantId]);

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
    setMobileHistoryOpen(false);
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsgText = input.trim();
    
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

    const aiMsgId = `ai-${Date.now()}`;
    const aiMsg: Message = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      const csrfToken = await getOrFetchCsrf();
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
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

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("event: tool")) {
            try {
              const data = JSON.parse(cleanLine.slice(12));
              setCurrentTool({ name: data.name, args: data.args });
            } catch {}
          }
          else if (cleanLine.startsWith("event: tool_result")) {
            try {
              const data = JSON.parse(cleanLine.slice(19));
              setCurrentTool((prev) => prev ? { ...prev, result: data.result } : null);
              
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, toolName: data.name, toolResult: data.result } : m
                )
              );
            } catch {}
          }
          else if (cleanLine.startsWith("data: ")) {
            try {
              const payload = JSON.parse(cleanLine.slice(6));
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
    "Show pipeline metrics and create a task",
    `Search contacts for ${firstContactName}`,
    "What are the active opportunities?",
    "Create a follow-up reminder for tomorrow",
  ];

  const selectConversation = (id: string) => {
    setActiveConvId(id);
    setMobileHistoryOpen(false);
  };

  const renderHistoryContent = () => (
    <>
      <button
        className="btn btn-secondary w-full justify-start text-xs font-semibold py-2"
        onClick={startNewChat}
      >
        <Plus size={14} /> New Conversation
      </button>

      <div className="flex-1 overflow-y-auto space-y-1">
        <p className="text-[10px] uppercase font-bold tracking-wider px-2 text-tertiary">
          History
        </p>
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => selectConversation(c.id)}
            className="w-full text-left text-xs rounded-md p-2.5 transition-all flex items-center gap-2 truncate"
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
          <p className="text-center text-[11px] py-4 text-tertiary">
            No past chats.
          </p>
        )}
      </div>
    </>
  );

  return (
    <div className="flex animate-fade-in gap-4 relative" style={{ height: "calc(100vh - 100px)" }}>
      
      {/* Desktop History Sidebar (Hidden on Mobile) */}
      {!isMobile && (
        <div className="w-64 flex flex-col bg-secondary border border-default rounded-xl p-3 space-y-3 shrink-0">
          {renderHistoryContent()}
        </div>
      )}

      {/* Mobile Drawer Overlay Backdrop */}
      <AnimatePresence>
        {isMobile && mobileHistoryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileHistoryOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer Content */}
      <AnimatePresence>
        {isMobile && mobileHistoryOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-0 bottom-0 left-0 w-72 bg-secondary border-r border-default p-4 z-40 flex flex-col space-y-3"
          >
            <div className="flex justify-between items-center pb-2 border-b border-default">
              <span className="text-xs font-bold text-primary">Chat Conversations</span>
              <button onClick={() => setMobileHistoryOpen(false)} className="text-secondary p-1">
                <X size={16} />
              </button>
            </div>
            {renderHistoryContent()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-secondary border border-default rounded-xl overflow-hidden relative">
        
        {/* Mobile Header Bar */}
        {isMobile && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-default bg-tertiary/20">
            <button
              onClick={() => setMobileHistoryOpen(true)}
              className="btn btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1 font-mono"
            >
              <History size={12} /> history
            </button>
            <span className="text-[10px] font-bold font-mono text-tertiary">agent_chat</span>
          </div>
        )}

        {/* Messages List Container */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center max-w-md mx-auto p-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-default bg-tertiary"
              >
                <Bot size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary font-mono uppercase">
                  ai_operations_assistant
                </p>
                <p className="text-[11px] mt-1 text-secondary leading-relaxed">
                  trigger CRM actions, search leads, or query analytics pipeline naturally.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full pt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    className="btn btn-secondary text-[11px] py-2 px-3 text-left justify-start font-mono"
                    onClick={() => setInput(s)}
                  >
                    🚀 {s.toLowerCase()}
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
                <div className="flex gap-2.5 max-w-[90%] sm:max-w-[80%]">
                  {msg.role === "assistant" && (
                    <div
                      className="flex h-7 w-7 min-w-[28px] items-center justify-center rounded-lg mt-0.5 border border-default bg-tertiary"
                    >
                      <Bot size={13} className="text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    {/* Tool Call Log Block */}
                    {msg.toolName && (
                      <ToolResultView name={msg.toolName} result={msg.toolResult} />
                    )}
                    
                    {/* Message Bubble */}
                    <div
                      className={`chat-bubble ${
                        msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"
                      }`}
                    >
                      {msg.content ? (
                        renderMarkdown(msg.content)
                      ) : (
                        <div className="flex gap-1 py-1 items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div
                      className="flex h-7 w-7 min-w-[28px] items-center justify-center rounded-lg mt-0.5 border border-default bg-tertiary text-primary text-[10px] font-bold"
                    >
                      {(session?.user?.name ?? session?.user?.email ?? "U")[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Live streaming tool progress bar */}
          {currentTool && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex gap-2.5 max-w-[85%] items-start">
                <div
                  className="flex h-7 w-7 min-w-[28px] items-center justify-center rounded-lg bg-tertiary border border-default"
                >
                  <Loader2 size={12} className="animate-spin text-primary" />
                </div>
                <div
                  className="rounded-lg border border-default bg-tertiary px-3 py-2 text-[11px] font-mono leading-relaxed"
                >
                  <span className="flex items-center gap-1.5 font-medium text-secondary">
                    <Wrench size={11} className="text-primary" /> Running tool: <code className="text-primary">{currentTool.name}</code>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div
            className="mx-4 mb-2 rounded border border-danger/10 px-3 py-1.5 text-xs bg-danger-bg text-danger font-mono"
          >
            {error}
          </div>
        )}

        {/* Input Form */}
        <div className="p-3 bg-tertiary/10" style={{ borderTop: "1px solid var(--border-default)" }}>
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
              style={{ padding: "8px 14px" }}
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
