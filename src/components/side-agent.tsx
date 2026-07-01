"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getOrFetchCsrf } from "@/lib/client-api";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolName?: string;
  timestamp: Date;
};

export function SideAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your side copilot. Ask me to search contacts, check metrics, or create tasks from anywhere.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [isOpen, messages, currentTool]);

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
        }),
      });

      if (!res.ok) throw new Error(await res.text());

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
              const idx = cleanLine.indexOf("data: ");
              if (idx !== -1) {
                const data = JSON.parse(cleanLine.slice(idx + 6));
                setCurrentTool(data.name);
              }
            } catch {}
          } 
          else if (cleanLine.startsWith("event: tool_result")) {
            try {
              const idx = cleanLine.indexOf("data: ");
              if (idx !== -1) {
                const data = JSON.parse(cleanLine.slice(idx + 6));
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId ? { ...m, toolName: data.name } : m
                  )
                );
              }
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
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Side agent failed", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, content: "Sorry, I encountered an error communicating with the agent server." } : m
        )
      );
    } finally {
      setStreaming(false);
      setCurrentTool(null);
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:scale-105 active:scale-95 transition-all select-none border border-default/20"
        style={{ 
          background: "var(--accent-gradient)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)"
        }}
        title="AI Assistant"
      >
        {isOpen ? <X size={18} /> : <Bot size={18} />}
      </button>

      {/* Slide-out Sidebar Agent Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-12 bottom-0 right-0 w-full sm:w-[360px] z-30 bg-secondary border-l border-default flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-default flex items-center justify-between bg-tertiary">
              <div className="flex items-center gap-2">
                <Sparkles size={14} style={{ color: "var(--text-primary)" }} />
                <span className="text-xs font-bold text-primary">Side Agent Console</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-icon"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Messages Body */}
            <div 
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto space-y-4"
              style={{ background: "var(--bg-primary)" }}
            >
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-tertiary border border-default flex items-center justify-center text-[10px] font-bold shrink-0">
                      AI
                    </div>
                  )}
                  <div className="min-w-0 max-w-[80%] flex flex-col gap-1">
                    {m.toolName && (
                      <span className="text-[9px] font-mono text-tertiary flex items-center gap-1">
                        🔧 Used {m.toolName}
                      </span>
                    )}
                    <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                      m.role === "user" 
                        ? "bg-dark-highlight text-white rounded-tr-none" 
                        : "bg-secondary border border-default text-primary rounded-tl-none"
                    }`}>
                      <p className="whitespace-pre-wrap">{m.content || "..."}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {currentTool && (
                <div className="flex gap-2.5 justify-start">
                  <div className="h-6 w-6 rounded-full bg-tertiary border border-default flex items-center justify-center text-[10px] font-bold shrink-0 animate-pulse">
                    AI
                  </div>
                  <div className="bg-secondary border border-dashed border-default text-secondary text-[10px] p-2 rounded-xl flex items-center gap-2">
                    <Loader2 size={11} className="animate-spin" />
                    <span>Running tool: {currentTool}...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="p-3 border-t border-default bg-tertiary flex gap-2"
            >
              <input
                type="text"
                placeholder="Ask your assistant..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="field text-xs flex-1 py-2 px-3 bg-secondary"
                disabled={streaming}
                style={{ borderRadius: "8px" }}
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="btn btn-primary px-3 py-2 shrink-0"
                style={{ borderRadius: "8px" }}
              >
                {streaming ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
