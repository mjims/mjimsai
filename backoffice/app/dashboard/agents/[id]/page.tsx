"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { agents as agentsApi, knowledge, auth } from "@/lib/api";
import type { Agent, AgentUpdate, ProvidersMap, KnowledgeDocument } from "@/lib/types";

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [providers, setProviders] = useState<ProvidersMap>({});
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [tab, setTab] = useState<"config" | "knowledge" | "integration">("config");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    agentsApi.get(id).then(setAgent).catch(() => router.push("/dashboard/agents"));
    agentsApi.providers().then(setProviders).catch(() => {});
    knowledge.list(id).then(d => setDocs(d.documents)).catch(() => {});
  }, [id, router]);

  async function save(data: AgentUpdate) {
    setSaving(true); setMsg("");
    try {
      const u = await agentsApi.update(id, data);
      setAgent(u); setMsg("Sauvegardé ✓");
      setTimeout(() => setMsg(""), 2000);
    } catch (e: unknown) { setMsg((e as Error).message); } finally { setSaving(false); }
  }

  async function uploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = await knowledge.upload(id, file);
      setDocs(p => [doc, ...p]);
    } catch (err: unknown) { alert((err as Error).message); }
    e.target.value = "";
  }

  async function deleteDoc(docId: string) {
    if (!confirm("Supprimer ce document ?")) return;
    await knowledge.delete(id, docId);
    setDocs(p => p.filter(d => d.id !== docId));
  }

  if (!agent) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  const inputCls = "w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all";
  const models = providers[agent.llm_provider] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{agent.name}</h1>
          <p className="text-surface-400 font-mono text-sm">/{agent.slug}</p>
        </div>
        {msg && <span className={`px-4 py-2 rounded-xl text-sm font-medium animate-fade-in ${msg.includes("✓") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
        {(["config", "knowledge", "integration"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
            {t === "config" ? "⚙️ Configuration" : t === "knowledge" ? "📄 Base de connaissances" : "🔌 Intégration"}
          </button>
        ))}
      </div>

      {/* Config tab */}
      {tab === "config" && (
        <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">Nom</label>
              <input type="text" defaultValue={agent.name} onBlur={e => { if (e.target.value !== agent.name) save({ name: e.target.value }); }} className={inputCls} /></div>
            <div><label className="block text-sm font-medium mb-1.5">Statut</label>
              <button onClick={() => save({ is_active: !agent.is_active })}
                className={`px-4 py-3 rounded-xl text-sm font-medium w-full text-left border ${agent.is_active ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-surface-50 border-surface-200 text-surface-500"}`}>
                {agent.is_active ? "✅ Actif" : "⏸️ Inactif"} — cliquer pour changer</button></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">Provider</label>
              <select defaultValue={agent.llm_provider} onChange={e => save({ llm_provider: e.target.value })} className={inputCls}>
                {Object.keys(providers).map(p => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium mb-1.5">Modèle</label>
              <select defaultValue={agent.llm_model} onChange={e => save({ llm_model: e.target.value })} className={inputCls}>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
                {!models.includes(agent.llm_model) && <option value={agent.llm_model}>{agent.llm_model}</option>}
              </select></div>
          </div>
          <div><label className="block text-sm font-medium mb-1.5">Prompt Système</label>
            <textarea defaultValue={agent.system_prompt} rows={10}
              onBlur={e => { if (e.target.value !== agent.system_prompt) save({ system_prompt: e.target.value }); }}
              className={`${inputCls} font-mono resize-y leading-relaxed`} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">Température ({agent.temperature})</label>
              <input type="range" min="0" max="2" step="0.1" defaultValue={agent.temperature}
                onChange={e => save({ temperature: parseFloat(e.target.value) })} className="w-full accent-primary-600" /></div>
            <div><label className="block text-sm font-medium mb-1.5">Message d&apos;accueil</label>
              <input type="text" defaultValue={agent.welcome_message}
                onBlur={e => { if (e.target.value !== agent.welcome_message) save({ welcome_message: e.target.value }); }} className={inputCls} /></div>
          </div>
        </div>
      )}

      {/* Knowledge tab */}
      {tab === "knowledge" && (
        <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Documents ({docs.length})</h2>
            <label className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl cursor-pointer hover:bg-primary-700 transition-colors">
              📎 Ajouter
              <input type="file" accept=".txt,.md,.pdf,.docx" onChange={uploadDoc} className="hidden" />
            </label>
          </div>
          {docs.length === 0 ? (
            <div className="text-center py-12 text-surface-400">
              <p className="text-4xl mb-3">📄</p>
              <p>Aucun document. Uploadez des PDF, DOCX, TXT ou Markdown pour enrichir l&apos;agent.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(d => (
                <div key={d.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <span className="text-lg">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.filename}</p>
                    <p className="text-xs text-surface-400">{(d.file_size_bytes / 1024).toFixed(0)} KB · {d.chunk_count} chunks · {d.status}</p>
                  </div>
                  <button onClick={() => deleteDoc(d.id)} className="text-surface-400 hover:text-red-500 p-1">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Integration tab */}
      {tab === "integration" && (
        <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5 animate-fade-in">
          <h2 className="text-lg font-semibold">Intégration du Widget</h2>
          <p className="text-sm text-surface-500">Copiez ce code dans le <code className="px-1.5 py-0.5 bg-surface-100 rounded text-xs">&lt;body&gt;</code> de votre site :</p>
          <pre className="p-4 bg-surface-900 text-emerald-400 rounded-xl text-sm font-mono overflow-x-auto leading-relaxed">
{`<script
  src="${typeof window !== "undefined" ? window.location.origin.replace(":3000", ":8080") : "https://your-api.com"}/widget.js"
  data-api-url="${typeof window !== "undefined" ? window.location.origin.replace(":3000", ":8080") : "https://your-api.com"}"
  data-api-key="VOTRE_CLE_API_ORG"
  data-agent="${agent.slug}"
  defer></script>`}
          </pre>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            💡 Retrouvez votre clé API organisation dans <strong>Paramètres</strong>.
          </div>
        </div>
      )}
    </div>
  );
}
