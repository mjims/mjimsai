"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminService } from "@/services/admin.service";
import { getApiError } from "@/lib/axios";

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      await adminService.acceptInvite(token, password);
      router.push("/dashboard");
    } catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">M</div>
          <h1 className="text-2xl font-bold text-surface-900">Définir votre mot de passe</h1>
          <p className="text-surface-500 text-sm mt-1">Finalisez votre compte administrateur</p>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 p-8">
          {!token ? (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">Lien d&apos;invitation invalide.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Mot de passe</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={inputCls} placeholder="Min. 8 caractères" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Confirmer</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className={inputCls} placeholder="••••••••" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}
              <button type="submit" disabled={loading || password.length < 8}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                {loading ? "..." : "Activer mon compte"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
