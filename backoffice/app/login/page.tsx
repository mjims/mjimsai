"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, ApiError } from "@/lib/api";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await auth.login(email, password);
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
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-32 right-16 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
                <path d="M12 12c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">MILA Open</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Créez des agents IA<br />
            <span className="text-primary-200">sur mesure</span>
          </h1>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            Configurez, personnalisez et déployez des agents IA conversationnels
            directement sur les sites de vos clients. Multi-provider, multi-langue, multi-tenant.
          </p>
          <div className="mt-12 flex flex-col gap-4 text-sm text-white/70">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">✨</div>
              <span>Claude, GPT-4o, Gemini, Grok — choix du provider par agent</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">📄</div>
              <span>Base de connaissances — PDF, DOCX, texte</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">🔌</div>
              <span>Widget intégrable en une ligne de code</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
                <path d="M12 12c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-surface-900">MILA Open</span>
          </div>

          <h2 className="text-2xl font-bold text-surface-900 mb-2">Connexion</h2>
          <p className="text-surface-500 mb-8">Accédez au dashboard de gestion de vos agents IA.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@example.com"
                className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                  transition-all placeholder:text-surface-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-1.5">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                  transition-all placeholder:text-surface-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold
                rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-surface-500">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Créer une organisation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
