"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { agentsService } from "@/services/agents.service";
import { conversationsService } from "@/services/conversations.service";
import type { Agent } from "@/types";
import Link from "next/link";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [totalAgents, setTotalAgents] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [agentData, convData] = await Promise.all([
          agentsService.list(0, 10),
          conversationsService.list({ page: 1, page_size: 1 }),
        ]);
        setAgents(agentData.agents.slice(0, 4));
        setTotalAgents(agentData.total);
        setTotalConversations(convData.total);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const activeAgents = agents.filter((a) => a.is_active).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">{t("title")}</h1>
        <p className="text-surface-500 mt-1">{t("subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[
          { label: t("stats.activeAgents"), value: activeAgents, sub: `/ ${totalAgents} total`, color: "bg-primary-50 text-primary-700", icon: "🤖" },
          { label: t("stats.conversations"), value: totalConversations, color: "bg-emerald-50 text-emerald-700", icon: "💬" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-surface-200 p-6 hover:shadow-card-hover transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${card.color}`}>{card.icon}</span>
              {"sub" in card && card.sub && <span className="text-xs text-surface-400">{card.sub}</span>}
            </div>
            <p className="text-3xl font-bold text-surface-900">{String(card.value)}</p>
            <p className="text-sm text-surface-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent agents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">{t("recentAgents")}</h2>
          <Link href="/dashboard/agents" className="text-sm text-primary-600 hover:text-primary-700 font-medium">{t("viewAll")}</Link>
        </div>

        {agents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🤖</div>
            <h3 className="text-lg font-semibold text-surface-900 mb-2">{t("noAgents.title")}</h3>
            <p className="text-surface-500 mb-6 max-w-sm mx-auto">{t("noAgents.desc")}</p>
            <Link href="/dashboard/agents/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors">
              + {t("noAgents.cta")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}
                className="bg-white rounded-2xl border border-surface-200 p-5 hover:shadow-card-hover hover:border-primary-200 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: (agent.widget_config?.primary_color || "#6366f1") + "20", color: agent.widget_config?.primary_color || "#6366f1" }}>
                    🤖
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-surface-900 group-hover:text-primary-700 transition-colors truncate">{agent.name}</h3>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${agent.is_active ? "bg-success" : "bg-surface-300"}`} />
                    </div>
                    <p className="text-sm text-surface-500 mt-0.5">{agent.llm_provider} / {agent.llm_model.split("-").slice(0, 2).join("-")}</p>
                    {agent.has_custom_api_key && (
                      <span className="inline-block mt-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Clé perso {agent.llm_api_key_hint}</span>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
                      <span>{agent.total_conversations} conv.</span>
                      <span>{agent.total_messages} msgs</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
