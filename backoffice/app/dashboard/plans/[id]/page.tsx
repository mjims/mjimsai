"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";
import { getApiError } from "@/lib/axios";

type FormData = {
  name: string; label: string; conversations_limit: string;
  price_monthly_eur: string; price_semiannual_eur: string; price_annual_eur: string;
  price_monthly_xof: string; price_semiannual_xof: string; price_annual_xof: string;
  features: string; is_active: boolean; sort_order: string; whatsapp_enabled: boolean; voice_enabled: boolean;
};

const num = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminService.getPlan(id).then((p) => {
      setForm({
        name: p.name, label: p.label, conversations_limit: String(p.conversations_limit),
        price_monthly_eur: num(p.price_monthly_eur), price_semiannual_eur: num(p.price_semiannual_eur), price_annual_eur: num(p.price_annual_eur),
        price_monthly_xof: num(p.price_monthly_xof), price_semiannual_xof: num(p.price_semiannual_xof), price_annual_xof: num(p.price_annual_xof),
        features: p.features.join("\n"), is_active: p.is_active, sort_order: String(p.sort_order), whatsapp_enabled: p.whatsapp_enabled, voice_enabled: p.voice_enabled,
      });
    }).catch((err) => setError(getApiError(err)));
  }, [id]);

  function set(field: keyof FormData, value: string | boolean) {
    setForm((f) => (f ? { ...f, [field]: value } : f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(""); setSaving(true);
    try {
      // name is the immutable slug — not editable
      await adminService.updatePlan(id, {
        label: form.label,
        conversations_limit: parseInt(form.conversations_limit) || 100,
        price_monthly_eur: form.price_monthly_eur ? parseFloat(form.price_monthly_eur) : null,
        price_semiannual_eur: form.price_semiannual_eur ? parseFloat(form.price_semiannual_eur) : null,
        price_annual_eur: form.price_annual_eur ? parseFloat(form.price_annual_eur) : null,
        price_monthly_xof: form.price_monthly_xof ? parseInt(form.price_monthly_xof) : null,
        price_semiannual_xof: form.price_semiannual_xof ? parseInt(form.price_semiannual_xof) : null,
        price_annual_xof: form.price_annual_xof ? parseInt(form.price_annual_xof) : null,
        features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
        whatsapp_enabled: form.whatsapp_enabled,
        voice_enabled: form.voice_enabled,
      });
      router.push("/dashboard/plans");
    } catch (err) { setError(getApiError(err)); }
    finally { setSaving(false); }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm";

  if (!form) {
    return error
      ? <div className="max-w-2xl mx-auto"><p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p></div>
      : <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-lg">←</button>
        <h1 className="text-2xl font-bold text-surface-900">Modifier le plan</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Nom (slug)</label>
            <input value={form.name} disabled className={`${inputCls} bg-surface-50 text-surface-400 cursor-not-allowed`} />
            <p className="text-xs text-surface-400 mt-1">Le slug n&apos;est pas modifiable</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Label affiché *</label>
            <input value={form.label} onChange={(e) => set("label", e.target.value)} required className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Conversations/mois (-1 = illimité)</label>
            <input value={form.conversations_limit} onChange={(e) => set("conversations_limit", e.target.value)} type="number" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Ordre d&apos;affichage</label>
            <input value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} type="number" className={inputCls} />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-surface-700 mb-3">Prix EUR</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { field: "price_monthly_eur", label: "Mensuel (€)" },
              { field: "price_semiannual_eur", label: "6 mois (€)" },
              { field: "price_annual_eur", label: "Annuel (€)" },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="block text-xs text-surface-500 mb-1">{label}</label>
                <input value={(form as unknown as Record<string, string>)[field]} onChange={(e) => set(field as keyof FormData, e.target.value)}
                  type="number" step="0.01" placeholder="0" className={inputCls} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-surface-700 mb-3">Prix XOF (Mobile Money)</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { field: "price_monthly_xof", label: "Mensuel (XOF)" },
              { field: "price_semiannual_xof", label: "6 mois (XOF)" },
              { field: "price_annual_xof", label: "Annuel (XOF)" },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="block text-xs text-surface-500 mb-1">{label}</label>
                <input value={(form as unknown as Record<string, string>)[field]} onChange={(e) => set(field as keyof FormData, e.target.value)}
                  type="number" placeholder="0" className={inputCls} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Fonctionnalités (une par ligne)</label>
          <textarea value={form.features} onChange={(e) => set("features", e.target.value)}
            rows={4} className={`${inputCls} resize-y font-mono`} />
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set("is_active", !form.is_active)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors ${form.is_active ? "bg-emerald-500" : "bg-surface-300"}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-4" : "translate-x-0"}`} />
          </button>
          <span className="text-sm text-surface-700">Plan actif (visible par les utilisateurs)</span>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set("whatsapp_enabled", !form.whatsapp_enabled)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors ${form.whatsapp_enabled ? "bg-emerald-500" : "bg-surface-300"}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.whatsapp_enabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
          <span className="text-sm text-surface-700">Intégration WhatsApp incluse</span>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set("voice_enabled", !form.voice_enabled)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors ${form.voice_enabled ? "bg-emerald-500" : "bg-surface-300"}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.voice_enabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
          <span className="text-sm text-surface-700">Messages vocaux (transcription audio) inclus</span>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-5 py-3 border border-surface-200 text-surface-700 rounded-xl text-sm font-medium">Annuler</button>
          <button type="submit" disabled={saving} className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
