"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { conversations as convApi } from "@/lib/api";
import type { Conversation } from "@/lib/types";

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [conv, setConv] = useState<Conversation | null>(null);

  useEffect(() => {
    convApi.get(id).then(setConv).catch(() => router.push("/dashboard/conversations"));
  }, [id, router]);

  if (!conv) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Conversation</h1>
          <p className="text-surface-400 text-sm font-mono">{conv.visitor_id}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${conv.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 text-surface-500"}`}>
          {conv.status}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {conv.messages.map(m => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary-600 text-white rounded-br-sm"
                  : "bg-surface-100 text-surface-800 rounded-bl-sm"
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`text-xs mt-2 ${m.role === "user" ? "text-white/60" : "text-surface-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {m.tokens_input != null && ` · ${m.tokens_input + (m.tokens_output || 0)} tokens`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
