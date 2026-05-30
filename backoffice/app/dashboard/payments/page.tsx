"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminService } from "@/services/admin.service";
import { getApiError } from "@/lib/axios";
import type { PaymentSetting, PaymentSettingUpdate } from "@/types";

const PROVIDER_META: Record<string, { label: string; fields: { key: keyof PaymentSettingUpdate; label: string; setFlag: keyof PaymentSetting; maskKey: keyof PaymentSetting }[]; hasBaseUrl: boolean }> = {
  stripe: {
    label: "Stripe (cartes)",
    hasBaseUrl: false,
    fields: [
      { key: "secret_key", label: "Secret key (sk_...)", setFlag: "secret_key_set", maskKey: "secret_key_masked" },
      { key: "webhook_secret", label: "Webhook secret (whsec_...)", setFlag: "webhook_secret_set", maskKey: "webhook_secret_masked" },
    ],
  },
  sebpay: {
    label: "Sebpay (Mobile Money)",
    hasBaseUrl: true,
    fields: [
      { key: "public_key", label: "Public key (pk_...)", setFlag: "public_key_set", maskKey: "public_key_masked" },
      { key: "secret_key", label: "Secret key (sk_...)", setFlag: "secret_key_set", maskKey: "secret_key_masked" },
    ],
  },
};

export default function PaymentsPage() {
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, PaymentSettingUpdate>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    adminService.getPaymentSettings().then(setSettings).catch((e) => setErr(getApiError(e))).finally(() => setLoading(false));
  }, []);

  function draftOf(provider: string): PaymentSettingUpdate {
    return drafts[provider] || {};
  }
  function setDraft(provider: string, patch: PaymentSettingUpdate) {
    setDrafts((d) => ({ ...d, [provider]: { ...d[provider], ...patch } }));
  }

  async function toggle(s: PaymentSetting) {
    setSaving(s.provider); setErr(""); setMsg("");
    try {
      const updated = await adminService.updatePaymentSetting(s.provider, { is_enabled: !s.is_enabled });
      setSettings((prev) => prev.map((x) => (x.provider === updated.provider ? updated : x)));
    } catch (e) { setErr(getApiError(e)); }
    finally { setSaving(null); }
  }

  async function save(s: PaymentSetting) {
    setSaving(s.provider); setErr(""); setMsg("");
    try {
      const updated = await adminService.updatePaymentSetting(s.provider, draftOf(s.provider));
      setSettings((prev) => prev.map((x) => (x.provider === updated.provider ? updated : x)));
      setDrafts((d) => ({ ...d, [s.provider]: {} }));
      setMsg(`${PROVIDER_META[s.provider]?.label || s.provider} mis à jour.`);
    } catch (e) { setErr(getApiError(e)); }
    finally { setSaving(null); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  const inputCls = "w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Paiements</h1>
          <p className="text-surface-500 mt-1">Configurez les clés, l&apos;URL de base et activez/désactivez chaque moyen.</p>
        </div>
        <Link href="/dashboard/payments/sebpay" className="px-4 py-2.5 text-sm font-medium text-primary-700 border border-primary-200 rounded-xl hover:bg-primary-50">
          Catalogue Sebpay →
        </Link>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{err}</p>}
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">{msg}</p>}

      {settings.map((s) => {
        const meta = PROVIDER_META[s.provider];
        const draft = draftOf(s.provider);
        return (
          <div key={s.provider} className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{meta?.label || s.provider}</h2>
              <button onClick={() => toggle(s)} disabled={saving === s.provider}
                className={`flex items-center gap-2 text-sm font-medium ${s.is_enabled ? "text-emerald-700" : "text-surface-500"}`}>
                <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${s.is_enabled ? "bg-emerald-500" : "bg-surface-300"}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${s.is_enabled ? "translate-x-4" : "translate-x-0"}`} />
                </span>
                {s.is_enabled ? "Activé" : "Désactivé"}
              </button>
            </div>

            {meta?.fields.map((f) => (
              <div key={String(f.key)}>
                <label className="block text-xs font-medium text-surface-500 mb-1">{f.label}</label>
                <input type="password" autoComplete="off"
                  value={(draft[f.key] as string) ?? ""}
                  onChange={(e) => setDraft(s.provider, { [f.key]: e.target.value } as PaymentSettingUpdate)}
                  placeholder={s[f.setFlag] ? `Configuré (${s[f.maskKey]}) — laisser vide pour conserver` : "Non configuré"}
                  className={`${inputCls} font-mono`} />
              </div>
            ))}

            {meta?.hasBaseUrl && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">URL de base</label>
                  <input value={(draft.base_url ?? s.base_url) ?? ""} onChange={(e) => setDraft(s.provider, { base_url: e.target.value })}
                    className={`${inputCls} font-mono`} placeholder="https://newapi.sebpay.bj/api/v1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Environnement</label>
                  <select value={(draft.environment ?? s.environment) ?? "sandbox"} onChange={(e) => setDraft(s.provider, { environment: e.target.value })} className={inputCls}>
                    <option value="sandbox">sandbox</option>
                    <option value="live">live</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => save(s)} disabled={saving === s.provider}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                {saving === s.provider ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
