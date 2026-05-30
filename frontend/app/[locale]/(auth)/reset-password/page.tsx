"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/lib/axios";

function ResetPasswordInner() {
  const t = useTranslations("auth.reset");
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const { setUser, setToken } = useAuth();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await authService.resetPassword(email, code.trim(), password);
      setToken(res.access_token);
      setUser(res.user);
      router.push("/dashboard");
    } catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">M</div>
          <h1 className="text-2xl font-bold text-surface-900">{t("title")}</h1>
          <p className="text-surface-500 mt-1">{t("subtitle")} <span className="font-medium text-surface-700">{email}</span></p>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">{t("code")}</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoFocus placeholder="000000"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white text-surface-900 text-center text-2xl tracking-[0.4em] font-mono outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">{t("newPassword")}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white text-surface-900 text-sm outline-none"
                placeholder="••••••••" />
            </div>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading || code.length < 4 || password.length < 8}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
              {loading ? "..." : t("submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
