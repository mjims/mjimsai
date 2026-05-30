"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { agentsService } from "@/services/agents.service";
import type { Agent } from "@/types";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
  grok: "xAI Grok",
};

export default function AgentsPage() {
  const [agentList, setAgentList] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentsService.list().then((data) => setAgentList(data.agents)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function toggleActive(agent: Agent) {
    try {
      const updated = await agentsService.update(agent.id, { is_active: !agent.is_active });
      setAgentList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet agent et toutes ses données ?")) return;
    try {
      await agentsService.delete(id);
      setAgentList((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Agents IA</h1>
          <p className="text-surface-500 mt-1">{agentList.length} agent{agentList.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/dashboard/agents/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouvel agent
        </Link>
      </div>

      {agentList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-16 text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl">🤖</div>
          <h3 className="text-xl font-semibold text-surface-900 mb-2">Créez votre premier agent</h3>
          <p className="text-surface-500 mb-8 max-w-md mx-auto">Définissez un prompt système, choisissez votre modèle LLM, et déployez un widget de chat.</p>
          <Link href="/dashboard/agents/new" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl">Commencer →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {agentList.map((agent) => (
            <div key={agent.id} className="bg-white rounded-2xl border border-surface-200 overflow-hidden hover:shadow-card-hover hover:border-primary-200 transition-all duration-300 group">
              <div className="h-1.5" style={{ backgroundColor: agent.widget_config?.primary_color || "#6366f1" }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: (agent.widget_config?.primary_color || "#6366f1") + "20", color: agent.widget_config?.primary_color || "#6366f1" }}>
                      🤖
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900">{agent.name}</h3>
                      <p className="text-xs text-surface-400 font-mono">/{agent.slug}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(agent)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors ${agent.is_active ? "bg-success" : "bg-surface-300"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${agent.is_active ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-surface-100 text-surface-600 text-xs font-medium rounded-lg">{PROVIDER_LABELS[agent.llm_provider] || agent.llm_provider}</span>
                  <span className="px-2.5 py-1 bg-surface-100 text-surface-600 text-xs font-mono rounded-lg truncate">{agent.llm_model.split("-").slice(0, 3).join("-")}</span>
                  {agent.has_custom_api_key && (
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg" title={`Clé: ${agent.llm_api_key_hint}`}>🔑</span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-surface-400 mb-4">
                  <span>💬 {agent.total_conversations}</span>
                  <span>📨 {agent.total_messages}</span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-surface-100">
                  <Link href={`/dashboard/agents/${agent.id}`} className="flex-1 py-2 text-center text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    Configurer
                  </Link>
                  <button onClick={() => handleDelete(agent.id)} className="py-2 px-3 text-sm text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
