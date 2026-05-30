"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";
import { getApiError } from "@/lib/axios";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await adminService.login(email, password, remember);
      setStep("otp");
      setInfo("Un code de validation a été envoyé à votre email.");
    } catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await adminService.verifyOtp(email, code.trim(), remember);
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
          <h1 className="text-2xl font-bold text-surface-900">MjimsAI Admin</h1>
          <p className="text-surface-500 text-sm mt-1">Backoffice — accès restreint</p>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 p-8">
          {step === "credentials" ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={inputCls} placeholder="admin@mjimsai.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Mot de passe</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={inputCls} placeholder="••••••••" />
              </div>
              <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-400" />
                Se souvenir de moi (7 jours)
              </label>
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}
              <button type="submit" disabled={loading || !email || !password}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                {loading ? "..." : "Continuer"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Code de validation</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoFocus
                  className={`${inputCls} text-center text-2xl tracking-[0.4em] font-mono`} placeholder="000000" />
              </div>
              {info && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">{info}</p>}
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}
              <button type="submit" disabled={loading || code.length < 4}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                {loading ? "..." : "Valider"}
              </button>
              <button type="button" onClick={() => { setStep("credentials"); setCode(""); setError(""); setInfo(""); }}
                className="w-full text-sm text-surface-500 hover:text-surface-700">← Retour</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
