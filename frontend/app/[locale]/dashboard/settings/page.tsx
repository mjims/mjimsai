"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";
import { getApiError } from "@/lib/axios";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState("");

  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.mjimsai.com";

  if (!user) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
    </div>
  );

  // Hydrate the form once the user is loaded
  if (!initialized) {
    setForm({ first_name: user.first_name, last_name: user.last_name, email: user.email });
    setInitialized(true);
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg(""); setSaving(true);
    const payload: Record<string, string> = {};
    if (form.first_name !== user!.first_name) payload.first_name = form.first_name;
    if (form.last_name !== user!.last_name) payload.last_name = form.last_name;
    const emailChanged = form.email !== user!.email;
    if (emailChanged) payload.email = form.email;
    if (pwd.new_password) { payload.current_password = pwd.current_password; payload.new_password = pwd.new_password; }

    try {
      const updated = await authService.updateProfile(payload);
      setUser(updated);
      setPwd({ current_password: "", new_password: "" });
      if (emailChanged && !updated.email_verified) {
        router.push(`/verify-email?email=${encodeURIComponent(updated.email)}`);
        return;
      }
      setMsg("Profil mis à jour.");
    } catch (e2) { setErr(getApiError(e2)); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Mon Compte</h1>
        <p className="text-surface-500 mt-1">Vos informations et paramètres</p>
      </div>

      {/* Editable profile */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Informations</h2>
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
            <p className="text-xs text-surface-400 mt-1">Changer l&apos;email demandera une nouvelle vérification.</p>
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

        {err && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{err}</div>}
        {msg && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">{msg}</div>}
        {user.is_suspended && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">⚠️ Ce compte est suspendu. Contactez le support.</div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>

      {/* API Key for widget */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Clé API Widget</h2>
        <p className="text-sm text-surface-500">
          Cette clé identifie votre compte dans le script widget. Utilisez-la avec le paramètre{" "}
          <code className="px-1 py-0.5 bg-surface-100 rounded text-xs font-mono">data-api-key</code>.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-mono truncate">
            {user.api_key}
          </code>
          <button
            onClick={() => copy(user.api_key, "api")}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${copied === "api" ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 hover:bg-surface-200 text-surface-700"}`}>
            {copied === "api" ? "Copié ✓" : "Copier"}
          </button>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          ⚠️ Ne partagez cette clé qu&apos;avec les sites sur lesquels vous intégrez vos agents.
        </div>
      </div>

      {/* Widget integration snippet */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Intégration Widget</h2>
        <p className="text-sm text-surface-500">
          Copiez ce code dans votre site, juste avant <code className="font-mono text-xs">&lt;/body&gt;</code>.
          Remplacez <code className="font-mono text-xs">SLUG_AGENT</code> par le slug de votre agent.
        </p>
        <pre className="p-4 bg-surface-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
{`<script
  src="${apiUrl}/widget.js"
  data-api-url="${apiUrl}"
  data-api-key="${user.api_key}"
  data-agent="SLUG_AGENT"
  defer></script>`}
        </pre>
        <button
          onClick={() => copy(
            `<script src="${apiUrl}/widget.js" data-api-url="${apiUrl}" data-api-key="${user.api_key}" data-agent="SLUG_AGENT" defer></script>`,
            "snippet"
          )}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${copied === "snippet" ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 hover:bg-surface-200 text-surface-700"}`}>
          {copied === "snippet" ? "Copié ✓" : "Copier le code"}
        </button>
      </div>
    </div>
  );
}
