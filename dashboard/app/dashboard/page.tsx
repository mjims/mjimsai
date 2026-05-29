"use client";

import { useEffect, useState } from "react";
import { agents, conversations } from "@/lib/api";
import type { Agent, ConversationListResponse } from "@/lib/types";
import Link from "next/link";

interface Stats {
  totalAgents: number;
  activeAgents: number;
  totalConversations: number;
  totalMessages: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalAgents: 0, activeAgents: 0, totalConversations: 0, totalMessages: 0 });
  const [recentAgents, setRecentAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [agentData, convData] = await Promise.all([
          agents.list(0, 10),
          conversations.list({ page: 1, page_size: 5 }),
        ]);
        const totalMessages = agentData.agents.reduce((s, a) => s + a.total_messages, 0);
        setStats({
          totalAgents: agentData.total,
          activeAgents: agentData.agents.filter((a) => a.is_active).length,
          totalConversations: convData.total,
          totalMessages,
        });
        setRecentAgents(agentData.agents.slice(0, 4));
      } catch {
        // API not available — show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: "Agents actifs", value: stats.activeAgents, total: stats.totalAgents, color: "bg-primary-50 text-primary-700", icon: "🤖" },
    { label: "Conversations", value: stats.totalConversations, color: "bg-emerald-50 text-emerald-700", icon: "💬" },
    { label: "Messages", value: stats.totalMessages, color: "bg-amber-50 text-amber-700", icon: "📨" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-surface-500 mt-1">Vue d&apos;ensemble de votre plateforme IA</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-surface-200 p-6 hover:shadow-card-hover transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${card.color}`}>
                {card.icon}
              </span>
              {"total" in card && card.total !== undefined && (
                <span className="text-xs text-surface-400 font-medium">/ {card.total} total</span>
              )}
            </div>
            <p className="text-3xl font-bold text-surface-900">{card.value.toLocaleString()}</p>
            <p className="text-sm text-surface-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent agents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Vos Agents</h2>
          <Link href="/dashboard/agents" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Voir tout →
          </Link>
        </div>

        {recentAgents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              🤖
            </div>
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Aucun agent créé</h3>
            <p className="text-surface-500 mb-6 max-w-sm mx-auto">
              Créez votre premier agent IA et commencez à l&apos;intégrer sur vos sites.
            </p>
            <Link href="/dashboard/agents/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Créer un agent
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentAgents.map((agent) => (
              <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}
                className="bg-white rounded-2xl border border-surface-200 p-5 hover:shadow-card-hover hover:border-primary-200 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: agent.widget_config.primary_color + "15", color: agent.widget_config.primary_color }}>
                    🤖
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-surface-900 group-hover:text-primary-700 transition-colors truncate">
                        {agent.name}
                      </h3>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${agent.is_active ? "bg-success" : "bg-surface-300"}`} />
                    </div>
                    <p className="text-sm text-surface-500 mt-0.5">
                      {agent.llm_provider} / {agent.llm_model.split("-").slice(0, 2).join("-")}
                    </p>
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
