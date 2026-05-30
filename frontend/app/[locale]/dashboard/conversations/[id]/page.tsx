"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { conversationsService } from "@/services/conversations.service";
import type { Conversation } from "@/types";
import { formatDate } from "@/lib/utils";

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    closed: "bg-surface-100 text-surface-500",
    archived: "bg-amber-50 text-amber-700",
  };
  return map[status] || "bg-surface-100 text-surface-500";
};

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [conv, setConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    conversationsService.get(id)
      .then(setConv)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleClose() {
    if (!conv) return;
    setClosing(true);
    try {
      await conversationsService.close(conv.id);
      setConv({ ...conv, status: "closed" });
    } catch {}
    finally { setClosing(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  if (notFound || !conv) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🔍</div>
        <p className="text-surface-600 mb-4">Conversation introuvable.</p>
        <Link href="/dashboard/conversations" className="text-primary-600 hover:underline text-sm">← Retour aux conversations</Link>
      </div>
    );
  }

  const meta = conv.metadata_ || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/conversations" className="text-sm text-surface-500 hover:text-surface-900">← Conversations</Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-surface-900 font-mono truncate">{conv.visitor_id}</h1>
            <p className="text-sm text-surface-400 mt-1">
              Agent <span className="font-mono">{conv.agent_id.substring(0, 8)}…</span> · {formatDate(conv.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(conv.status)}`}>{conv.status}</span>
            {conv.status === "active" && (
              <button onClick={handleClose} disabled={closing}
                className="px-4 py-2 text-sm font-medium text-surface-700 border border-surface-200 rounded-xl hover:bg-surface-50 disabled:opacity-60 transition-colors">
                {closing ? "..." : "Clôturer"}
              </button>
            )}
          </div>
        </div>

        {conv.summary && (
          <div className="mt-4 p-3 bg-surface-50 rounded-xl">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Résumé</p>
            <p className="text-sm text-surface-700">{conv.summary}</p>
          </div>
        )}

        {Object.keys(meta).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-surface-500">
            {Object.entries(meta).map(([k, v]) => (
              <span key={k}><span className="font-medium text-surface-400">{k}:</span> {String(v)}</span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {conv.messages.length === 0 && (
          <p className="text-center text-surface-400 text-sm py-8">Aucun message.</p>
        )}
        {conv.messages.map((m) => {
          const isUser = m.role === "user";
          const isSystem = m.role === "system";
          if (isSystem) {
            return (
              <div key={m.id} className="text-center">
                <span className="inline-block px-3 py-1 text-xs text-surface-400 bg-surface-100 rounded-full">{m.content}</span>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "bg-primary-600 text-white" : "bg-white border border-surface-200 text-surface-800"}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`text-[10px] mt-1.5 ${isUser ? "text-primary-100" : "text-surface-400"}`}>{formatDate(m.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
