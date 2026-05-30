"use client";

import { useEffect, useState } from "react";
import adminClient from "@/lib/axios";
import { adminService } from "@/services/admin.service";

export default function SystemPage() {
  const [health, setHealth] = useState<{ database: string; status: string } | null>(null);
  const [apiHealth, setApiHealth] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getHealth().catch(() => null),
      adminClient.get<Record<string, unknown>>("/health").then((r: { data: Record<string, unknown> }) => r.data).catch(() => null),
    ]).then(([h, api]) => { setHealth(h); setApiHealth(api); }).finally(() => setLoading(false));
  }, []);

  const StatusBadge = ({ ok }: { ok: boolean }) => (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {ok ? "✓ OK" : "✗ Erreur"}
    </span>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Système</h1>
        <p className="text-surface-500 mt-1">État de l&apos;infrastructure MjimsAI</p>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">API Backend</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
            <span className="text-sm text-surface-700">API Status</span>
            <StatusBadge ok={apiHealth?.status === "healthy"} />
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
            <span className="text-sm text-surface-700">Base de données</span>
            <StatusBadge ok={health?.database === "ok"} />
          </div>
          {!!apiHealth?.app && (
            <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
              <span className="text-sm text-surface-700">Application</span>
              <span className="text-sm font-mono text-surface-600">{String(apiHealth.app)}</span>
            </div>
          )}
          {!!apiHealth?.version && (
            <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
              <span className="text-sm text-surface-700">Version</span>
              <span className="text-sm font-mono text-surface-600">v{String(apiHealth.version)}</span>
            </div>
          )}
          {!!apiHealth?.environment && (
            <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
              <span className="text-sm text-surface-700">Environnement</span>
              <span className="text-sm text-surface-600 capitalize">{String(apiHealth.environment)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold mb-3">Configuration</h2>
        <p className="text-sm text-surface-500">
          API URL: <code className="px-2 py-0.5 bg-surface-100 rounded text-xs font-mono">{process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}</code>
        </p>
      </div>
    </div>
  );
}
