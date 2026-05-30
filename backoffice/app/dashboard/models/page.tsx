"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import { getApiError } from "@/lib/axios";
import type { LLMModel } from "@/types";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  gemini: "Google (Gemini)",
  grok: "xAI (Grok)",
  deepseek: "DeepSeek",
};

export default function ModelsPage() {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Inline add form
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ provider: "", model_id: "", label: "" });

  useEffect(() => {
    Promise.all([adminService.listModels(), adminService.listSupportedProviders()])
      .then(([m, p]) => {
        setModels(m);
        setProviders(p);
        setForm((f) => ({ ...f, provider: f.provider || p[0] || "" }));
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(model: LLMModel) {
    setBusy(model.id);
    try {
      const updated = await adminService.updateModel(model.id, { is_active: !model.is_active });
      setModels((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) { setError(getApiError(err)); }
    finally { setBusy(null); }
  }

  async function handleDelete(model: LLMModel) {
    if (!confirm(`Supprimer le modèle "${model.model_id}" ?`)) return;
    setBusy(model.id);
    try {
      await adminService.deleteModel(model.id);
      setModels((prev) => prev.filter((m) => m.id !== model.id));
    } catch (err) { setError(getApiError(err)); }
    finally { setBusy(null); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setAdding(true);
    try {
      const created = await adminService.createModel({
        provider: form.provider,
        model_id: form.model_id.trim(),
        label: form.label.trim() || form.model_id.trim(),
        is_active: true,
        sort_order: models.filter((m) => m.provider === form.provider).length,
      });
      setModels((prev) => [...prev, created]);
      setForm((f) => ({ ...f, model_id: "", label: "" }));
    } catch (err) { setError(getApiError(err)); }
    finally { setAdding(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  // Group by provider
  const grouped = providers
    .map((prov) => ({ prov, items: models.filter((m) => m.provider === prov) }))
    .filter((g) => g.items.length > 0 || providers.includes(g.prov));

  const inputCls = "px-3 py-2 rounded-lg border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Modèles IA</h1>
        <p className="text-surface-500 mt-1">
          Gérez les modèles disponibles par provider. Désactivez ceux qui ne sont plus servis, ajoutez les nouveaux — sans toucher au code.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-surface-200 p-5">
        <p className="text-sm font-semibold text-surface-700 mb-3">Ajouter un modèle</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-surface-500">Provider</label>
            <select value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} className={inputCls}>
              {providers.map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p] || p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-xs text-surface-500">Model ID (API)</label>
            <input value={form.model_id} onChange={(e) => setForm((f) => ({ ...f, model_id: e.target.value }))} required placeholder="claude-opus-4-8" className={`${inputCls} w-full font-mono`} />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-surface-500">Label affiché</label>
            <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Claude Opus 4.8" className={`${inputCls} w-full`} />
          </div>
          <button type="submit" disabled={adding || !form.provider} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {adding ? "Ajout..." : "+ Ajouter"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}

      {/* Grouped tables */}
      {grouped.map(({ prov, items }) => (
        <div key={prov} className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-100 bg-surface-50">
            <p className="font-semibold text-surface-800">{PROVIDER_LABELS[prov] || prov}</p>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-surface-100">
              {items.length === 0 && (
                <tr><td className="px-5 py-6 text-sm text-surface-400">Aucun modèle pour ce provider.</td></tr>
              )}
              {items.map((m) => (
                <tr key={m.id} className="hover:bg-surface-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-surface-900">{m.label}</p>
                    <p className="text-xs text-surface-400 font-mono">{m.model_id}</p>
                  </td>
                  <td className="px-5 py-3 w-20">
                    <button onClick={() => toggleActive(m)} disabled={busy === m.id}
                      className={`w-10 h-6 rounded-full p-0.5 transition-colors disabled:opacity-60 ${m.is_active ? "bg-emerald-500" : "bg-surface-300"}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${m.is_active ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3 w-28 text-right">
                    <button onClick={() => handleDelete(m)} disabled={busy === m.id}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors disabled:opacity-60">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
