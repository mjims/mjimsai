"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, ApiError } from "@/lib/api";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    org_name: "",
    org_slug: "",
    email: "",
    username: "",
    password: "",
    full_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Auto-generate slug from org name
    if (field === "org_name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 100);
      setForm((prev) => ({ ...prev, org_slug: slug }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await auth.register(form);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-50">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
              <path d="M12 12c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-surface-900">MILA Open</span>
        </div>

        <h2 className="text-2xl font-bold text-surface-900 mb-2">Créer une organisation</h2>
        <p className="text-surface-500 mb-8">Configurez votre espace et commencez à créer vos agents IA.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-5 bg-white border border-surface-200 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-surface-600 uppercase tracking-wider">Organisation</h3>
            <div>
              <label htmlFor="org_name" className="block text-sm font-medium text-surface-700 mb-1.5">Nom</label>
              <input id="org_name" type="text" value={form.org_name} onChange={(e) => updateField("org_name", e.target.value)} required placeholder="Mon Entreprise"
                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
            </div>
            <div>
              <label htmlFor="org_slug" className="block text-sm font-medium text-surface-700 mb-1.5">Identifiant (slug)</label>
              <input id="org_slug" type="text" value={form.org_slug} onChange={(e) => updateField("org_slug", e.target.value)} required pattern="^[a-z0-9-]+$" placeholder="mon-entreprise"
                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
            </div>
          </div>

          <div className="p-5 bg-white border border-surface-200 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-surface-600 uppercase tracking-wider">Compte administrateur</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-surface-700 mb-1.5">Nom complet</label>
                <input id="full_name" type="text" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} placeholder="Jean Dupont"
                  className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-surface-700 mb-1.5">Username</label>
                <input id="username" type="text" value={form.username} onChange={(e) => updateField("username", e.target.value)} required minLength={2} placeholder="admin"
                  className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
              </div>
            </div>
            <div>
              <label htmlFor="reg_email" className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
              <input id="reg_email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} required placeholder="admin@example.com"
                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
            </div>
            <div>
              <label htmlFor="reg_password" className="block text-sm font-medium text-surface-700 mb-1.5">Mot de passe</label>
              <input id="reg_password" type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} required minLength={8} placeholder="Min. 8 caractères"
                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm hover:shadow-md">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Création...
              </span>
            ) : "Créer mon organisation"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-surface-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
