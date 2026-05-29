"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { conversations as convApi, agents as agentsApi } from "@/lib/api";
import type { ConversationListItem, Agent } from "@/lib/types";

export default function ConversationsPage() {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [agentMap, setAgentMap] = useState<Record<string, Agent>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [convData, agentData] = await Promise.all([
          convApi.list({ page, page_size: 20 }),
          agentsApi.list(0, 100),
        ]);
        setItems(convData.conversations);
        setTotal(convData.total);
        const map: Record<string, Agent> = {};
        agentData.agents.forEach(a => { map[a.id] = a; });
        setAgentMap(map);
      } catch { /* empty */ }
      finally { setLoading(false); }
    }
    load();
  }, [page]);

  const totalPages = Math.ceil(total / 20);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Conversations</h1>
        <p className="text-surface-500 mt-1">{total} conversation{total !== 1 ? "s" : ""} au total</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-16 text-center">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-lg font-semibold mb-2">Aucune conversation</h3>
          <p className="text-surface-500">Les conversations apparaîtront ici quand les visiteurs utiliseront vos agents.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-5 py-3 font-medium text-surface-500">Visiteur</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500">Agent</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500">Messages</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500">Statut</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/conversations/${c.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                      {c.visitor_id.substring(0, 12)}...
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-surface-600">{agentMap[c.agent_id]?.name || "—"}</td>
                  <td className="px-5 py-3 text-surface-600">{c.message_count}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 text-surface-500"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-surface-400 text-xs">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-surface-100">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm border border-surface-200 disabled:opacity-40 hover:bg-surface-50">←</button>
              <span className="text-sm text-surface-500">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-sm border border-surface-200 disabled:opacity-40 hover:bg-surface-50">→</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
