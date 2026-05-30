"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import { getApiError } from "@/lib/axios";
import type { AdminUser } from "@/types";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [adding, setAdding] = useState(false);

  const self = adminService.getAdmin();

  useEffect(() => {
    adminService.listAdmins().then(setAdmins).catch((e) => setError(getApiError(e))).finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setInfo(""); setAdding(true);
    try {
      const created = await adminService.createAdmin(form);
      setAdmins((prev) => [...prev, created]);
      setForm({ first_name: "", last_name: "", email: "" });
      setInfo(`Invitation envoyée à ${created.email}.`);
    } catch (e2) { setError(getApiError(e2)); }
    finally { setAdding(false); }
  }

  async function toggleActive(a: AdminUser) {
    setBusy(a.id);
    try {
      const updated = await adminService.setAdminActive(a.id, !a.is_active);
      setAdmins((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) { setError(getApiError(e)); }
    finally { setBusy(null); }
  }

  async function handleDelete(a: AdminUser) {
    if (!confirm(`Supprimer l'admin "${a.email}" ?`)) return;
    setBusy(a.id);
    try {
      await adminService.deleteAdmin(a.id);
      setAdmins((prev) => prev.filter((x) => x.id !== a.id));
    } catch (e) { setError(getApiError(e)); }
    finally { setBusy(null); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  const inputCls = "px-3 py-2 rounded-lg border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Administrateurs</h1>
        <p className="text-surface-500 mt-1">Gérez les accès au backoffice. Les nouveaux admins reçoivent une invitation par email.</p>
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-surface-200 p-5">
        <p className="text-sm font-semibold text-surface-700 mb-3">Inviter un administrateur</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-surface-500">Prénom</label>
            <input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} required className={inputCls} placeholder="Jean" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-surface-500">Nom</label>
            <input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} required className={inputCls} placeholder="Dupont" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs text-surface-500">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required className={`${inputCls} w-full`} placeholder="admin@exemple.com" />
          </div>
          <button type="submit" disabled={adding} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {adding ? "Envoi..." : "+ Inviter"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}
      {info && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">{info}</p>}

      <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-100">
              {["Admin", "Statut", "Dernière connexion", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-surface-50">
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-surface-900">
                    {[a.first_name, a.last_name].filter(Boolean).join(" ") || "—"}
                    {self?.id === a.id && <span className="ml-2 text-xs text-primary-600">(vous)</span>}
                  </p>
                  <p className="text-xs text-surface-400">{a.email}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${a.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {a.is_active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-surface-400">
                  {a.last_login_at ? new Date(a.last_login_at).toLocaleDateString("fr-FR") : "Jamais"}
                </td>
                <td className="px-5 py-4">
                  {self?.id !== a.id && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(a)} disabled={busy === a.id}
                        className="px-3 py-1.5 text-xs font-medium text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-50 disabled:opacity-60">
                        {a.is_active ? "Désactiver" : "Activer"}
                      </button>
                      <button onClick={() => handleDelete(a)} disabled={busy === a.id}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60">
                        Supprimer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
