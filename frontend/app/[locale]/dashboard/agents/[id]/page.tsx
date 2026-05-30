"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { agentsService } from "@/services/agents.service";
import { knowledgeService } from "@/services/knowledge.service";
import { billingService } from "@/services/billing.service";
import { getApiError } from "@/lib/axios";
import type { Agent, AgentSubscription, BillingPeriod, KnowledgeDocument, Plan, SebpayOperator } from "@/types";
import { SEBPAY_OPERATORS } from "@/types";

type Tab = "config" | "knowledge" | "subscription" | "apiKey" | "integration";

const PERIOD_LABELS: Record<BillingPeriod, { label: string; discount: string }> = {
  monthly: { label: "Mensuel", discount: "" },
  semiannual: { label: "6 mois", discount: "-15%" },
  annual: { label: "Annuel", discount: "-20%" },
};

function getPriceXof(plan: Plan, period: BillingPeriod): number | null {
  if (period === "monthly") return plan.price_monthly_xof;
  if (period === "semiannual") return plan.price_semiannual_xof;
  return plan.price_annual_xof;
}

function getPriceEur(plan: Plan, period: BillingPeriod): number | null {
  if (period === "monthly") return plan.price_monthly_eur;
  if (period === "semiannual") return plan.price_semiannual_eur;
  return plan.price_annual_eur;
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("agents");
  const tCommon = useTranslations("common");

  const [agent, setAgent] = useState<Agent | null>(null);
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "config");
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({ name: "", system_prompt: "", temperature: 0.7, max_tokens: 2048, welcome_message: "" });

  // Subscription tab
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<AgentSubscription | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [payMode, setPayMode] = useState<"stripe" | "sebpay" | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<SebpayOperator>("mtn");
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");

  // API key tab
  const [newApiKey, setNewApiKey] = useState("");
  const [keyVisible, setKeyVisible] = useState(false);
  const [keyMsg, setKeyMsg] = useState("");

  const [uploading, setUploading] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  useEffect(() => {
    async function load() {
      try {
        const a = await agentsService.get(id);
        setAgent(a);
        setForm({ name: a.name, system_prompt: a.system_prompt, temperature: a.temperature, max_tokens: a.max_tokens, welcome_message: a.welcome_message });
        setPeriod(a.billing_period as BillingPeriod);
        const [d, p, s] = await Promise.all([
          knowledgeService.list(id).catch(() => []),
          billingService.getPlans().catch(() => []),
          billingService.getAgentSubscription(id).catch(() => null),
        ]);
        setDocs(d);
        setPlans(p);
        setSub(s);
      } catch { router.push("/dashboard/agents"); }
      finally { setLoading(false); }
    }
    load();
  }, [id, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaveError("");
    if (!agent) return;
    setSaving(true);
    try {
      const updated = await agentsService.update(agent.id, form);
      setAgent(updated);
    } catch (err) { setSaveError(getApiError(err)); }
    finally { setSaving(false); }
  }

  async function handleStripeSubscribe(plan: Plan) {
    if (!agent) return;
    setPaying(true); setPayMsg("");
    try {
      const origin = window.location.origin;
      const { url } = await billingService.subscribeStripe(
        agent.id, plan.id, period,
        `${origin}/dashboard/billing?success=1`,
        `${origin}/dashboard/agents/${agent.id}?tab=subscription`
      );
      window.location.href = url;
    } catch (err) { setPayMsg(getApiError(err)); }
    finally { setPaying(false); }
  }

  async function handleSebpaySubscribe() {
    if (!agent || !selectedPlan || !phone) return;
    // Strip leading + from phone (Sebpay requires international format without +)
    const cleanPhone = phone.replace(/^\+/, "");
    setPaying(true); setPayMsg("");
    try {
      const result = await billingService.subscribeSebpay(agent.id, {
        plan_id: selectedPlan.id,
        billing_period: period,
        phone: cleanPhone,
        operator,
        country: "BJ",
      });
      if (result.provider_link) {
        window.open(result.provider_link, "_blank");
        setPayMsg(`Paiement initié. Confirmez sur votre téléphone. Réf: ${result.reference}`);
      } else {
        setPayMsg(`Paiement en attente de confirmation. Réf: ${result.reference}`);
      }
      setPayMode(null);
    } catch (err) { setPayMsg(getApiError(err)); }
    finally { setPaying(false); }
  }

  async function handleUpdateApiKey() {
    if (!agent) return;
    try {
      const updated = await agentsService.setApiKey(agent.id, newApiKey);
      setAgent(updated); setNewApiKey(""); setKeyMsg("Clé mise à jour !");
      setTimeout(() => setKeyMsg(""), 3000);
    } catch (err) { setKeyMsg(getApiError(err)); }
  }

  async function handleRemoveApiKey() {
    if (!agent || !confirm("Supprimer la clé API stockée ?")) return;
    try {
      const updated = await agentsService.removeApiKey(agent.id);
      setAgent(updated); setKeyMsg("Clé supprimée.");
      setTimeout(() => setKeyMsg(""), 2000);
    } catch (err) { setKeyMsg(getApiError(err)); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !agent) return;
    setUploading(true);
    try {
      const doc = await knowledgeService.upload(agent.id, file);
      setDocs((prev) => [...prev, doc]);
    } catch {}
    finally { setUploading(false); e.target.value = ""; }
  }

  if (loading || !agent) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
    </div>
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: "config", label: t("tabs.config") },
    { key: "knowledge", label: t("tabs.knowledge") },
    { key: "subscription", label: `Abonnement${sub?.plan ? " ✓" : ""}` },
    { key: "apiKey", label: `${t("tabs.apiKey")} ${agent.has_custom_api_key ? "🔑" : ""}` },
    { key: "integration", label: t("tabs.integration") },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{agent.name}</h1>
          <p className="text-surface-500 font-mono text-sm">/{agent.slug} · {agent.llm_provider}/{agent.llm_model.split("-").slice(0, 3).join("-")}</p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${agent.is_active ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 text-surface-500"}`}>
          {agent.is_active ? t("active") : t("inactive")}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Config */}
      {tab === "config" && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold">Configuration</h2>
          {[
            { name: "name", label: "Nom de l'agent", type: "text" },
            { name: "welcome_message", label: "Message d'accueil", type: "text" },
          ].map(({ name, label, type }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">{label}</label>
              <input type={type} value={(form as Record<string, unknown>)[name] as string}
                onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Prompt système</label>
            <textarea value={form.system_prompt} onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
              rows={8} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm font-mono resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Température ({form.temperature})</label>
              <input type="range" min="0" max="2" step="0.1" value={form.temperature}
                onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
                className="w-full accent-primary-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Max tokens</label>
              <input type="number" min={100} max={32000} value={form.max_tokens}
                onChange={(e) => setForm((f) => ({ ...f, max_tokens: parseInt(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm" />
            </div>
          </div>
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <button type="submit" disabled={saving}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl disabled:opacity-60">
            {saving ? "..." : tCommon("save")}
          </button>
        </form>
      )}

      {/* Knowledge */}
      {tab === "knowledge" && (
        <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Base de connaissances</h2>
          <label className={`flex items-center gap-3 px-5 py-3 border-2 border-dashed border-surface-300 hover:border-primary-400 rounded-xl cursor-pointer transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            <span className="text-sm font-medium text-surface-600">{uploading ? "Upload..." : "Cliquez pour uploader (PDF, DOCX, TXT, MD)"}</span>
            <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={handleUpload} />
          </label>
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl border border-surface-200">
              <span>📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 truncate">{doc.filename}</p>
                <p className="text-xs text-surface-400">{(doc.file_size_bytes / 1024).toFixed(1)} KB · {doc.status}</p>
              </div>
              <button onClick={async () => { await knowledgeService.delete(agent.id, doc.id); setDocs((d) => d.filter((x) => x.id !== doc.id)); }}
                className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Subscription */}
      {tab === "subscription" && (
        <div className="space-y-5">
          {/* Current plan */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6">
            <h2 className="text-lg font-semibold mb-3">Plan actuel</h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg capitalize ${sub?.plan ? "bg-primary-50 text-primary-700" : "bg-surface-100 text-surface-500"}`}>
                {sub?.plan?.label ?? "Gratuit (100 conv/mois)"}
              </span>
              {agent.billing_period !== "monthly" && (
                <span className="text-sm text-surface-500">{PERIOD_LABELS[agent.billing_period as BillingPeriod]?.label}</span>
              )}
            </div>
            {sub && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-surface-500 mb-1">
                  <span>{sub.conversations_this_month.toLocaleString()} conv. ce mois</span>
                  <span>{sub.conversations_limit === -1 ? "Illimité" : `/ ${sub.conversations_limit.toLocaleString()}`}</span>
                </div>
                {sub.conversations_limit > 0 && (
                  <div className="w-full bg-surface-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${(sub.usage_percent ?? 0) > 80 ? "bg-warning" : "bg-primary-500"}`}
                      style={{ width: `${Math.min(sub.usage_percent ?? 0, 100)}%` }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Period selector */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Changer de plan</h2>
            <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit mb-5">
              {(["monthly", "semiannual", "annual"] as BillingPeriod[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
                  {PERIOD_LABELS[p].label}{PERIOD_LABELS[p].discount && <span className="ml-1 text-xs text-emerald-600 font-semibold">{PERIOD_LABELS[p].discount}</span>}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const eur = getPriceEur(plan, period);
                const xof = getPriceXof(plan, period);
                const isCurrent = sub?.plan?.id === plan.id;
                return (
                  <div key={plan.id} className={`bg-white rounded-2xl border p-5 ${isCurrent ? "border-primary-500 shadow-lg shadow-primary-500/10" : "border-surface-200"}`}>
                    {isCurrent && <span className="inline-block mb-2 px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">Plan actuel</span>}
                    <h3 className="font-bold text-surface-900">{plan.label}</h3>
                    <p className="text-xl font-bold text-surface-900 mt-2">
                      {eur === null ? "Sur mesure" : eur === 0 ? "Gratuit" : `${eur}€`}
                      {eur !== null && eur > 0 && <span className="text-sm font-normal text-surface-400"> {period === "monthly" ? "/mois" : period === "semiannual" ? "/ 6 mois" : "/an"}</span>}
                    </p>
                    {xof !== null && xof > 0 && <p className="text-xs text-surface-400">{xof.toLocaleString()} XOF</p>}
                    <p className="text-sm text-surface-500 mt-1 mb-4">
                      {plan.conversations_limit === -1 ? "Illimité" : `${plan.conversations_limit.toLocaleString()} conv/mois`}
                    </p>
                    {!isCurrent && plan.name !== "free" && plan.name !== "enterprise" && (
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleStripeSubscribe(plan)} disabled={paying}
                          className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl disabled:opacity-60">
                          💳 Payer par carte
                        </button>
                        <button onClick={() => { setSelectedPlan(plan); setPayMode("sebpay"); }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl">
                          📱 Mobile Money
                        </button>
                      </div>
                    )}
                    {plan.name === "enterprise" && (
                      <a href="mailto:contact@mjimsai.com"
                        className="block text-center py-2 border border-surface-300 text-surface-700 text-sm font-medium rounded-xl hover:border-primary-400 hover:text-primary-700">
                        Nous contacter
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {payMsg && <p className="text-sm font-medium text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">{payMsg}</p>}

          {/* Sebpay modal */}
          {payMode === "sebpay" && selectedPlan && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-modal">
                <h3 className="font-bold text-surface-900 mb-1">📱 Mobile Money</h3>
                <p className="text-sm text-surface-500 mb-4">
                  {selectedPlan.label} · {PERIOD_LABELS[period].label}
                  {getPriceXof(selectedPlan, period) !== null && ` · ${getPriceXof(selectedPlan, period)?.toLocaleString()} XOF`}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Téléphone (sans +)</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="22997000000"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm" />
                    <p className="text-xs text-surface-400 mt-1">Format international sans +, ex: 22997000000</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Opérateur</label>
                    <select value={operator} onChange={(e) => setOperator(e.target.value as SebpayOperator)}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white">
                      {SEBPAY_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setPayMode(null)} className="flex-1 py-3 border border-surface-200 text-surface-700 rounded-xl text-sm">Annuler</button>
                  <button onClick={handleSebpaySubscribe} disabled={paying || !phone}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                    {paying ? "..." : "Confirmer"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* API Key */}
      {tab === "apiKey" && (
        <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">{t("apiKey.title")}</h2>
            <p className="text-sm text-surface-500 mt-1">{t("apiKey.desc")}</p>
          </div>
          {agent.has_custom_api_key && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-800">
                {t("apiKey.current")}: <code className="font-mono">{agent.llm_api_key_hint}</code>
              </p>
              <button onClick={handleRemoveApiKey}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200">
                {t("apiKey.remove")}
              </button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">{t("apiKey.update")}</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input type={keyVisible ? "text" : "password"} value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder={t("apiKey.placeholder")}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm font-mono" />
                <button type="button" onClick={() => setKeyVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                  {keyVisible ? "🙈" : "👁"}
                </button>
              </div>
              <button onClick={handleUpdateApiKey} disabled={!newApiKey}
                className="px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl disabled:opacity-60">
                {tCommon("save")}
              </button>
            </div>
          </div>
          {keyMsg && <p className={`text-sm font-medium ${keyMsg.startsWith("Clé") ? "text-red-600" : "text-emerald-700"}`}>{keyMsg}</p>}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            🔒 La clé est chiffrée (Fernet AES) et jamais retournée en clair par l&apos;API.
          </div>
        </div>
      )}

      {/* Integration */}
      {tab === "integration" && (
        <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Code d&apos;intégration</h2>
          <pre className="p-4 bg-surface-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
{`<script
  src="${apiUrl}/widget.js"
  data-api-url="${apiUrl}"
  data-api-key="VOTRE_CLE_API"
  data-agent="${agent.slug}"
  defer></script>`}
          </pre>
          <p className="text-sm text-surface-500">
            Trouvez votre <code className="font-mono text-xs">data-api-key</code> dans <strong>Paramètres → Mon Compte</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
