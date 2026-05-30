"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import { getApiError } from "@/lib/axios";

export default function ProfilePage() {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    adminService.getMe()
      .then((a) => setForm({ first_name: a.first_name, last_name: a.last_name, email: a.email }))
      .catch((e) => setErr(getApiError(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg(""); setSaving(true);
    const payload: Record<string, string> = {
      first_name: form.first_name, last_name: form.last_name, email: form.email,
    };
    if (pwd.new_password) { payload.current_password = pwd.current_password; payload.new_password = pwd.new_password; }
    try {
      await adminService.updateMe(payload);
      setPwd({ current_password: "", new_password: "" });
      setMsg("Profil mis à jour.");
    } catch (e2) { setErr(getApiError(e2)); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  const inputCls = "w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Mon profil</h1>
        <p className="text-surface-500 mt-1">Vos informations d&apos;administrateur</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Prénom</label>
            <input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Nom</label>
            <input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-surface-500 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <div className="pt-2 border-t border-surface-100">
          <p className="text-sm font-medium text-surface-700 mb-3">Changer le mot de passe</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Mot de passe actuel</label>
              <input type="password" autoComplete="current-password" value={pwd.current_password} onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Nouveau mot de passe</label>
              <input type="password" autoComplete="new-password" value={pwd.new_password} onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))} className={inputCls} />
            </div>
          </div>
        </div>

        {err && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{err}</p>}
        {msg && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">{msg}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
