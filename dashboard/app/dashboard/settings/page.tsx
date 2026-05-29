"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/api";
import type { Organization } from "@/lib/types";

export default function SettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    auth.organization().then(setOrg).catch(() => {});
  }, []);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  if (!org) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Paramètres</h1>
        <p className="text-surface-500 mt-1">Configuration de votre organisation</p>
      </div>

      {/* Org info */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Organisation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Nom</label>
            <p className="text-sm font-medium">{org.name}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Slug</label>
            <p className="text-sm font-mono text-surface-600">{org.slug}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Plan</label>
            <span className="px-3 py-1 bg-primary-50 text-primary-700 text-sm font-medium rounded-lg">{org.plan}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Créé le</label>
            <p className="text-sm text-surface-600">{new Date(org.created_at).toLocaleDateString("fr-FR")}</p>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Clé API (Widget)</h2>
        <p className="text-sm text-surface-500">Utilisez cette clé dans le paramètre <code className="px-1 py-0.5 bg-surface-100 rounded text-xs font-mono">data-api-key</code> du widget.</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-mono truncate">{org.api_key}</code>
          <button onClick={() => copy(org.api_key, "api")}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${copied === "api" ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 hover:bg-surface-200 text-surface-700"}`}>
            {copied === "api" ? "Copié ✓" : "Copier"}
          </button>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          ⚠️ Ne partagez cette clé qu&apos;avec les sites autorisés. Elle donne accès à vos agents.
        </div>
      </div>

      {/* Integration example */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Intégration Rapide</h2>
        <pre className="p-4 bg-surface-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
{`<script
  src="https://your-api-domain.com/widget.js"
  data-api-url="https://your-api-domain.com"
  data-api-key="${org.api_key}"
  data-agent="YOUR_AGENT_SLUG"
  defer></script>`}
        </pre>
        <button onClick={() => copy(`<script src="https://your-api-domain.com/widget.js" data-api-url="https://your-api-domain.com" data-api-key="${org.api_key}" data-agent="YOUR_AGENT_SLUG" defer></script>`, "snippet")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${copied === "snippet" ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 hover:bg-surface-200 text-surface-700"}`}>
          {copied === "snippet" ? "Copié ✓" : "Copier le code"}
        </button>
      </div>
    </div>
  );
}
