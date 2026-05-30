"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { PlatformStats } from "@/types";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  const cards = stats ? [
    { label: "Utilisateurs totaux", value: stats.total_users, sub: `${stats.active_users} actifs`, icon: "👥", color: "bg-primary-50 text-primary-700" },
    { label: "Suspendus", value: stats.suspended_users, icon: "🚫", color: "bg-red-50 text-red-700" },
    { label: "Agents IA", value: stats.total_agents, icon: "🤖", color: "bg-purple-50 text-purple-700" },
    { label: "Conv. ce mois", value: stats.total_conversations_this_month, icon: "💬", color: "bg-emerald-50 text-emerald-700" },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Vue d&apos;ensemble</h1>
        <p className="text-surface-500 mt-1">Statistiques de la plateforme MjimsAI</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-surface-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${card.color}`}>{card.icon}</span>
              {"sub" in card && card.sub && <span className="text-xs text-surface-400">{card.sub}</span>}
            </div>
            <p className="text-3xl font-bold text-surface-900">{card.value.toLocaleString()}</p>
            <p className="text-sm text-surface-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Plans distribution */}
      {stats && Object.keys(stats.plans).length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-200 p-6">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Répartition des agents par plan</h2>
          <div className="space-y-3">
            {Object.entries(stats.plans).map(([plan, count]) => {
              const total = stats.total_agents || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-surface-700 capitalize">{plan}</span>
                    <span className="text-surface-500">{count} agent{count !== 1 ? "s" : ""} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-2">
                    <div className="h-2 bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
