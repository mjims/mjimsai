"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { agents as agentsApi } from "@/lib/api";
import type { AgentCreate, ProvidersMap } from "@/lib/types";

const DEFAULT: AgentCreate = {
  name: "", slug: "", description: "",
  system_prompt: "Tu es un assistant IA professionnel et amical. Réponds de manière claire et utile.",
  llm_provider: "anthropic", llm_model: "claude-sonnet-4-20250514",
  temperature: 0.7, max_tokens: 2048,
  welcome_message: "Bonjour ! 👋 Comment puis-je vous aider ?",
  widget_config: { primary_color: "#6366f1", text_color: "#ffffff", position: "bottom-right", bubble_icon: "chat", border_radius: 16, font_family: "Inter, sans-serif" },
  max_conversation_turns: 50,
};

export default function NewAgentPage() {
  const router = useRouter();
  const [form, setForm] = useState<AgentCreate>(DEFAULT);
  const [providers, setProviders] = useState<ProvidersMap>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => { agentsApi.providers().then(setProviders).catch(() => {}); }, []);

  function set<K extends keyof AgentCreate>(k: K, v: AgentCreate[K]) {
    setForm(p => ({ ...p, [k]: v }));
    if (k === "name") {
      const s = (v as string).toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").substring(0, 100);
      setForm(p => ({ ...p, slug: s }));
    }
    if (k === "llm_provider") {
      const m = providers[v as string];
      if (m?.length) setForm(p => ({ ...p, llm_model: m[0] }));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const a = await agentsApi.create(form);
      router.push(`/dashboard/agents/${a.id}`);
    } catch (err: unknown) { setError((err as Error).message); } finally { setLoading(false); }
  }

  const models = providers[form.llm_provider] || [];
  const inputCls = "w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Nouvel Agent IA</h1>
        <p className="text-surface-500 mt-1">Configurez votre agent en 3 étapes</p>
      </div>
      <div className="flex gap-3">
        {["Identité", "IA & Prompt", "Widget"].map((l, i) => (
          <button key={i} onClick={() => setStep(i + 1)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${step === i + 1 ? "bg-primary-600 text-white" : step > i + 1 ? "bg-primary-100 text-primary-700" : "bg-surface-100 text-surface-500"}`}>
            {i + 1}. {l}
          </button>
        ))}
      </div>
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      <form onSubmit={submit}>
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5 animate-fade-in">
            <h2 className="text-lg font-semibold">Identité</h2>
            <div><label className="block text-sm font-medium mb-1.5">Nom *</label><input type="text" value={form.name} onChange={e => set("name", e.target.value)} required placeholder="Assistant Support" className={inputCls} /></div>
            <div><label className="block text-sm font-medium mb-1.5">Slug *</label><input type="text" value={form.slug} onChange={e => set("slug", e.target.value)} required pattern="^[a-z0-9-]+$" className={`${inputCls} font-mono`} /></div>
            <div><label className="block text-sm font-medium mb-1.5">Description</label><textarea value={form.description||""} onChange={e => set("description", e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
            <div className="flex justify-end"><button type="button" onClick={() => setStep(2)} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">Suivant →</button></div>
          </div>
        )}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5 animate-fade-in">
            <h2 className="text-lg font-semibold">Configuration IA</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Provider</label>
                <select value={form.llm_provider} onChange={e => set("llm_provider", e.target.value)} className={inputCls}>
                  {Object.keys(providers).length ? Object.keys(providers).map(p => <option key={p} value={p}>{p}</option>) : <option value="anthropic">anthropic</option>}
                </select></div>
              <div><label className="block text-sm font-medium mb-1.5">Modèle</label>
                <select value={form.llm_model} onChange={e => set("llm_model", e.target.value)} className={inputCls}>
                  {models.length ? models.map(m => <option key={m} value={m}>{m}</option>) : <option value={form.llm_model}>{form.llm_model}</option>}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Température ({form.temperature})</label>
                <input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={e => set("temperature", parseFloat(e.target.value))} className="w-full accent-primary-600" /></div>
              <div><label className="block text-sm font-medium mb-1.5">Tokens max</label>
                <input type="number" value={form.max_tokens} onChange={e => set("max_tokens", parseInt(e.target.value))} min={100} max={32000} className={inputCls} /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">Prompt Système *</label>
              <textarea value={form.system_prompt} onChange={e => set("system_prompt", e.target.value)} rows={8} required className={`${inputCls} font-mono resize-y leading-relaxed`} />
              <p className="text-xs text-surface-400 mt-1">Définit le comportement de l&apos;agent.</p></div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="px-6 py-2.5 bg-surface-100 text-surface-700 rounded-xl font-medium hover:bg-surface-200">← Retour</button>
              <button type="button" onClick={() => setStep(3)} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">Suivant →</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5 animate-fade-in">
            <h2 className="text-lg font-semibold">Widget</h2>
            <div><label className="block text-sm font-medium mb-1.5">Message d&apos;accueil</label>
              <input type="text" value={form.welcome_message} onChange={e => set("welcome_message", e.target.value)} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5">Couleur</label>
                <div className="flex gap-3"><input type="color" value={form.widget_config.primary_color} onChange={e => set("widget_config", {...form.widget_config, primary_color: e.target.value})} className="w-12 h-12 rounded-xl border-2 border-surface-200 cursor-pointer" />
                <input type="text" value={form.widget_config.primary_color} onChange={e => set("widget_config", {...form.widget_config, primary_color: e.target.value})} className={`flex-1 ${inputCls} font-mono`} /></div></div>
              <div><label className="block text-sm font-medium mb-1.5">Position</label>
                <select value={form.widget_config.position} onChange={e => set("widget_config", {...form.widget_config, position: e.target.value as "bottom-right"|"bottom-left"})} className={inputCls}>
                  <option value="bottom-right">Bas droite</option><option value="bottom-left">Bas gauche</option></select></div>
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(2)} className="px-6 py-2.5 bg-surface-100 text-surface-700 rounded-xl font-medium hover:bg-surface-200">← Retour</button>
              <button type="submit" disabled={loading} className="px-8 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-60 active:scale-[0.98]">
                {loading ? "Création..." : "Créer l'agent ✨"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
