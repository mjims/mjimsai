"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { agentsService } from "@/services/agents.service";
import { getApiError } from "@/lib/axios";
import type { WidgetConfig } from "@/types";

// Providers & models are admin-managed (DB-sourced via the API). No hardcoded
// fallback so the UI always reflects the current catalog.
const DEFAULT_PROVIDERS: Record<string, string[]> = {};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  grok: "xAI Grok",
};

const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  primary_color: "#6366f1",
  text_color: "#ffffff",
  position: "bottom-right",
  bubble_icon: "💬",
  border_radius: 12,
  font_family: "Inter",
};

export default function NewAgentPage() {
  const router = useRouter();
  const tCommon = useTranslations("common");

  const [providers, setProviders] = useState<Record<string, string[]>>(DEFAULT_PROVIDERS);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    system_prompt: "Tu es un assistant virtuel utile et courtois.",
    welcome_message: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
    llm_provider: "openai",
    llm_model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 2048,
    llm_api_key: "",
    max_conversation_turns: 20,
  });

  useEffect(() => {
    agentsService.providers()
      .then((data) => {
        if (Object.keys(data).length > 0) {
          setProviders(data);
          const firstProv = Object.keys(data)[0];
          setForm((f) => ({
            ...f,
            llm_provider: firstProv,
            llm_model: data[firstProv][0] || "",
          }));
        }
      })
      .catch(() => {
        // use default fallback
      })
      .finally(() => setLoadingProviders(false));
  }, []);

  // Auto-slugification when typing name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9-\s]/g, "") // remove special chars except spaces/hyphens
      .trim()
      .replace(/\s+/g, "-"); // spaces to hyphens

    setForm((f) => ({ ...f, name, slug }));
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = e.target.value;
    const models = providers[prov] || [];
    setForm((f) => ({
      ...f,
      llm_provider: prov,
      llm_model: models[0] || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        system_prompt: form.system_prompt,
        llm_provider: form.llm_provider,
        llm_model: form.llm_model,
        temperature: form.temperature,
        max_tokens: form.max_tokens,
        welcome_message: form.welcome_message,
        llm_api_key: form.llm_api_key || undefined,
        widget_config: DEFAULT_WIDGET_CONFIG,
        max_conversation_turns: form.max_conversation_turns,
      };

      const newAgent = await agentsService.create(payload);
      router.push(`/dashboard/agents/${newAgent.id}`);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/agents")}
          className="p-2 bg-white border border-surface-200 text-surface-600 rounded-xl hover:bg-surface-50 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Nouvel agent</h1>
          <p className="text-surface-500 mt-1">Créez et configurez un nouvel agent de chat conversationnel.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main config card */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-surface-900 border-b border-surface-100 pb-3">Informations générales</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Nom de l&apos;agent</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={handleNameChange}
                    placeholder="Mon Assistant Support"
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Slug (identifiant unique)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">/</span>
                    <input
                      type="text"
                      required
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                      placeholder="mon-assistant"
                      className="w-full pl-6 pr-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Description (interne)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Utilisé pour le support client sur la page d'accueil"
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Message d&apos;accueil</label>
                <input
                  type="text"
                  required
                  value={form.welcome_message}
                  onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Prompt système (Directives)</label>
                <textarea
                  required
                  value={form.system_prompt}
                  onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white font-mono resize-y"
                  placeholder="Tu es un agent conversationnel qui aide les visiteurs..."
                />
              </div>
            </div>
          </div>

          {/* Model settings side card */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-surface-900 border-b border-surface-100 pb-3">Modèle IA</h2>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Fournisseur (LLM)</label>
                <select
                  value={form.llm_provider}
                  onChange={handleProviderChange}
                  disabled={loadingProviders}
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white"
                >
                  {Object.keys(providers).map((prov) => (
                    <option key={prov} value={prov}>
                      {PROVIDER_LABELS[prov] || prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Modèle</label>
                <select
                  value={form.llm_model}
                  onChange={(e) => setForm((f) => ({ ...f, llm_model: e.target.value }))}
                  disabled={loadingProviders}
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white font-mono"
                >
                  {(providers[form.llm_provider] || []).map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Clé API personnalisée (optionnelle)</label>
                <input
                  type="password"
                  value={form.llm_api_key}
                  onChange={(e) => setForm((f) => ({ ...f, llm_api_key: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white font-mono"
                />
                <p className="text-xs text-surface-400 mt-1">Si absente, la clé par défaut de la plateforme sera utilisée.</p>
              </div>

              <div className="border-t border-surface-100 pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Température ({form.temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
                    className="w-full accent-primary-600"
                  />
                  <div className="flex justify-between text-[10px] text-surface-400">
                    <span>Précis (0.0)</span>
                    <span>Créatif (2.0)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Max tokens</label>
                  <input
                    type="number"
                    min={100}
                    max={32000}
                    value={form.max_tokens}
                    onChange={(e) => setForm((f) => ({ ...f, max_tokens: parseInt(e.target.value) || 2048 }))}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 outline-none text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard/agents")}
                className="flex-1 py-3 bg-white border border-surface-200 text-surface-700 font-medium rounded-xl hover:bg-surface-50 transition-colors text-sm"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl disabled:opacity-60 transition-colors text-sm shadow-lg shadow-primary-600/10"
              >
                {saving ? "Création..." : "Créer l'agent"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
