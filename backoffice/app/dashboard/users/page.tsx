"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import type { UserAdminResponse } from "@/types";

export default function UsersPage() {
  const [users, setUsers] = useState<UserAdminResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const LIMIT = 25;

  useEffect(() => {
    setLoading(true);
    adminService.listUsers(skip, LIMIT).then((res) => { setUsers(res.users); setTotal(res.total); }).catch(() => {}).finally(() => setLoading(false));
  }, [skip]);

  async function toggleSuspend(user: UserAdminResponse) {
    setBusy(user.id);
    try {
      await adminService.suspendUser(user.id, !user.is_suspended);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u)));
    } catch {}
    finally { setBusy(null); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Utilisateurs</h1>
        <p className="text-surface-500 mt-1">{total} utilisateur{total !== 1 ? "s" : ""} au total</p>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-100">
              {["Utilisateur", "Agents", "Statut", "Créé le", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-surface-50">
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-surface-900">{[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}</p>
                  <p className="text-xs text-surface-400">{user.email}</p>
                </td>
                <td className="px-5 py-4 text-sm text-surface-600">{user.agent_count}</td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${user.is_suspended ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {user.is_suspended ? "Suspendu" : "Actif"}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-surface-400">{new Date(user.created_at).toLocaleDateString("fr-FR")}</td>
                <td className="px-5 py-4">
                  <button onClick={() => toggleSuspend(user)} disabled={busy === user.id}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-60 ${user.is_suspended ? "text-emerald-700 border-emerald-200 hover:bg-emerald-50" : "text-red-700 border-red-200 hover:bg-red-50"}`}>
                    {user.is_suspended ? "Réactiver" : "Suspendre"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-surface-400 text-sm">Aucun utilisateur.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-500">Page {Math.floor(skip / LIMIT) + 1} sur {Math.ceil(total / LIMIT)}</p>
          <div className="flex gap-2">
            <button disabled={skip <= 0} onClick={() => setSkip((s) => Math.max(0, s - LIMIT))} className="px-4 py-2 text-sm border border-surface-200 rounded-xl disabled:opacity-40 hover:bg-surface-50">← Précédent</button>
            <button disabled={skip + LIMIT >= total} onClick={() => setSkip((s) => s + LIMIT)} className="px-4 py-2 text-sm border border-surface-200 rounded-xl disabled:opacity-40 hover:bg-surface-50">Suivant →</button>
          </div>
        </div>
      )}
    </div>
  );
}
