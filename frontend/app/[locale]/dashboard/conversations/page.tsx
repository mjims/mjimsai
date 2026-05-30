"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { conversationsService } from "@/services/conversations.service";
import type { ConversationListItem } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function ConversationsPage() {
  const t = useTranslations("conversations");
  const [convs, setConvs] = useState<ConversationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setLoading(true);
    conversationsService.list({ page, page_size: PAGE_SIZE })
      .then((res) => { setConvs(res.conversations); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-50 text-emerald-700",
      closed: "bg-surface-100 text-surface-500",
      archived: "bg-amber-50 text-amber-700",
    };
    return map[status] || "bg-surface-100 text-surface-500";
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">{t("title")}</h1>
        <p className="text-surface-500 mt-1">{total} conversation{total !== 1 ? "s" : ""} au total</p>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
        {convs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">💬</div>
            <p className="text-surface-500">Aucune conversation pour l&apos;instant.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                {["Visiteur", t("agent"), "Messages", "Statut", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {convs.map((conv) => (
                <tr key={conv.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/conversations/${conv.id}`} className="font-mono text-sm text-primary-600 hover:text-primary-700">
                      {conv.visitor_id.substring(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm text-surface-600">{conv.agent_id.substring(0, 8)}...</td>
                  <td className="px-5 py-4 text-sm text-surface-600">{conv.message_count}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(conv.status)}`}>
                      {(t as unknown as (key: string) => string)(`status.${conv.status}`) || conv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-surface-400">{formatDate(conv.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-500">Page {page} sur {Math.ceil(total / PAGE_SIZE)}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl disabled:opacity-40 hover:bg-surface-50 transition-colors">
              ← Précédent
            </button>
            <button disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl disabled:opacity-40 hover:bg-surface-50 transition-colors">
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
