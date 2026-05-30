"use client";

import { useEffect, useState } from "react";
import { agentsService } from "@/services/agents.service";
import { billingService } from "@/services/billing.service";
import type { Agent, AgentSubscription } from "@/types";
import Link from "next/link";

interface AgentWithSub {
  agent: Agent;
  sub: AgentSubscription | null;
}

export default function BillingPage() {
  const [agentSubs, setAgentSubs] = useState<AgentWithSub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { agents } = await agentsService.list(0, 100);
        const results = await Promise.all(
          agents.map(async (agent) => {
            try {
              const sub = await billingService.getAgentSubscription(agent.id);
              return { agent, sub };
            } catch {
              return { agent, sub: null };
            }
          })
        );
        setAgentSubs(results);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
    </div>
  );

  const PERIOD_LABELS: Record<string, string> = {
    monthly: "Mensuel",
    semiannual: "6 mois",
    annual: "Annuel",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Abonnements</h1>
        <p className="text-surface-500 mt-1">Chaque agent a son propre plan selon son trafic estimé.</p>
      </div>

      {agentSubs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-16 text-center">
          <div className="text-3xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-surface-900 mb-2">Aucun agent</h3>
          <p className="text-surface-500 mb-6">Créez d&apos;abord un agent pour gérer son abonnement.</p>
          <Link href="/dashboard/agents/new"
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors">
            Créer un agent
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {agentSubs.map(({ agent, sub }) => {
            const limit = sub?.conversations_limit ?? 100;
            const count = sub?.conversations_this_month ?? 0;
            const pct = limit > 0 ? Math.min(count / limit * 100, 100) : 0;

            return (
              <div key={agent.id} className="bg-white rounded-2xl border border-surface-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-surface-900">{agent.name}</h3>
                      <span className={`w-2 h-2 rounded-full ${agent.is_active ? "bg-success" : "bg-surface-300"}`} />
                      <code className="text-xs text-surface-400 font-mono">/{agent.slug}</code>
                    </div>

                    {/* Plan badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${sub?.plan ? "bg-primary-50 text-primary-700" : "bg-surface-100 text-surface-500"}`}>
                        {sub?.plan?.label ?? "Gratuit"}
                      </span>
                      {agent.billing_period && agent.billing_period !== "monthly" && (
                        <span className="text-xs text-surface-400">{PERIOD_LABELS[agent.billing_period]}</span>
                      )}
                      {agent.subscription_expires_at && (
                        <span className="text-xs text-surface-400">
                          Expire le {new Date(agent.subscription_expires_at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>

                    {/* Usage bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-surface-500">
                        <span>{count.toLocaleString()} conversations ce mois</span>
                        <span>{limit === -1 ? "Illimité" : `/ ${limit.toLocaleString()}`}</span>
                      </div>
                      {limit > 0 && (
                        <div className="w-full bg-surface-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${pct > 80 ? "bg-warning" : "bg-primary-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      {pct > 80 && (
                        <p className="text-xs text-warning font-medium">⚠ Quota bientôt atteint</p>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/agents/${agent.id}?tab=subscription`}
                    className="shrink-0 px-4 py-2 border border-primary-300 text-primary-700 hover:bg-primary-50 text-sm font-medium rounded-xl transition-colors">
                    Gérer le plan →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
