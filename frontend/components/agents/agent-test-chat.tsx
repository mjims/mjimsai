"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function AgentTestChat({
  agentSlug,
  apiKey,
  welcomeMessage,
  primaryColor,
}: {
  agentSlug: string;
  apiKey: string;
  welcomeMessage?: string;
  primaryColor?: string;
}) {
  const greeting = welcomeMessage || "Bonjour ! Comment puis-je vous aider ?";
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const conversationId = useRef<string | null>(null);
  const visitorId = useRef<string>("test-" + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)));
  const scrollRef = useRef<HTMLDivElement>(null);

  const accent = primaryColor || "#4f46e5";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  function reset() {
    conversationId.current = null;
    setError("");
    setMessages([{ role: "assistant", content: greeting }]);
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    if (!apiKey) { setError("Clé API indisponible."); return; }

    setError("");
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch(`${apiUrl}/api/v1/chat/agent/${agentSlug}/stream`, {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          visitor_id: visitorId.current,
          conversation_id: conversationId.current,
        }),
      });

      if (!res.ok || !res.body) {
        let detail = `Erreur ${res.status}`;
        try { const j = await res.json(); if (j?.detail) detail = String(j.detail); } catch {}
        if (res.status === 429) detail = "Quota de conversations atteint pour cet agent.";
        appendError(detail);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";
        for (const block of blocks) {
          const line = block.trim();
          if (!line.startsWith("data:")) continue;
          let evt: { type?: string; content?: string; conversation_id?: string; message?: string };
          try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (evt.type === "meta" && evt.conversation_id) {
            conversationId.current = evt.conversation_id;
          } else if (evt.type === "chunk" && evt.content) {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + evt.content };
              return copy;
            });
          } else if (evt.type === "error") {
            appendError(evt.message || "Une erreur est survenue.");
          }
        }
      }
    } catch (e) {
      appendError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setStreaming(false);
    }
  }

  function appendError(msg: string) {
    setError(msg);
    setMessages((m) => {
      // Drop a trailing empty assistant bubble if no content streamed.
      if (m.length && m[m.length - 1].role === "assistant" && m[m.length - 1].content === "") {
        return m.slice(0, -1);
      }
      return m;
    });
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-surface-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: accent + "22", color: accent }}>🤖</span>
          <div>
            <p className="text-sm font-semibold text-surface-900 leading-tight">Test en direct</p>
            <p className="text-[11px] text-surface-400 leading-tight">Réponse de l&apos;agent enregistré</p>
          </div>
        </div>
        <button onClick={reset} className="text-xs text-surface-500 hover:text-surface-800">Réinitialiser</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-50">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${isUser ? "text-white" : "bg-white border border-surface-200 text-surface-800"}`}
                style={isUser ? { backgroundColor: accent } : undefined}>
                {m.content || (streaming && i === messages.length - 1 ? <span className="text-surface-400">…</span> : "")}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{error}</p>}

      <div className="p-3 border-t border-surface-100 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Écrivez un message de test…"
          disabled={streaming}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm disabled:opacity-60"
        />
        <button onClick={send} disabled={streaming || !input.trim()}
          className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: accent }}>
          {streaming ? "…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
