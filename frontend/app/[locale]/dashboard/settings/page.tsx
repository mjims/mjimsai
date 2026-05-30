"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState("");

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Mon Compte</h1>
        <p className="text-surface-500 mt-1">Vos informations et paramètres</p>
      </div>

      {/* User info */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Informations</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Nom d'utilisateur", value: user.username },
            { label: "Email", value: user.email },
            { label: "Nom complet", value: user.full_name || "—" },
            { label: "Membre depuis", value: new Date(user.created_at).toLocaleDateString("fr-FR") },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-medium text-surface-400 mb-1">{label}</p>
              <p className="text-sm font-medium text-surface-900">{value}</p>
            </div>
          ))}
        </div>
        {user.is_suspended && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            ⚠️ Ce compte est suspendu. Contactez le support.
          </div>
        )}
      </div>

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
