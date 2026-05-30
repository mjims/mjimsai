"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminService } from "@/services/admin.service";
import type { Plan } from "@/types";

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    adminService.listPlans().then(setPlans).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function toggleActive(plan: Plan) {
    setToggling(plan.id);
    try {
      const updated = await adminService.updatePlan(plan.id, { is_active: !plan.is_active });
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {}
    finally { setToggling(null); }
  }

  async function handleDelete(plan: Plan) {
    if (!confirm(`Supprimer le plan "${plan.label}" ?`)) return;
    try {
      await adminService.deletePlan(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } catch {}
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Plans d&apos;abonnement</h1>
          <p className="text-surface-500 mt-1">{plans.length} plan{plans.length !== 1 ? "s" : ""} configuré{plans.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/dashboard/plans/new"
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors text-sm">
          + Nouveau plan
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-100">
              {["Ordre", "Plan", "Conversations/mois", "Mensuel (EUR)", "Mensuel (XOF)", "Actif", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-surface-50 transition-colors">
                <td className="px-5 py-4 text-sm text-surface-500">{plan.sort_order}</td>
                <td className="px-5 py-4">
                  <p className="font-medium text-surface-900">{plan.label}</p>
                  <p className="text-xs text-surface-400 font-mono">{plan.name}</p>
                </td>
                <td className="px-5 py-4 text-sm text-surface-600">
                  {plan.conversations_limit === -1 ? "Illimité" : plan.conversations_limit.toLocaleString()}
                </td>
                <td className="px-5 py-4 text-sm text-surface-600">
                  {plan.price_monthly_eur !== null ? `${plan.price_monthly_eur}€` : "—"}
                </td>
                <td className="px-5 py-4 text-sm text-surface-600">
                  {plan.price_monthly_xof !== null ? `${plan.price_monthly_xof.toLocaleString()} XOF` : "—"}
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => toggleActive(plan)} disabled={toggling === plan.id}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors disabled:opacity-60 ${plan.is_active ? "bg-emerald-500" : "bg-surface-300"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${plan.is_active ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/plans/${plan.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 rounded-lg border border-primary-200 transition-colors">
                      Modifier
                    </Link>
                    <button onClick={() => handleDelete(plan)}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-surface-400 text-sm">
                  Aucun plan. <Link href="/dashboard/plans/new" className="text-primary-600 hover:underline">Créer le premier plan →</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
