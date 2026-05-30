"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth.service";
import { getApiError } from "@/lib/axios";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgot");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await authService.forgotPassword(email);
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">M</div>
          <h1 className="text-2xl font-bold text-surface-900">{t("title")}</h1>
          <p className="text-surface-500 mt-1">{t("subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">{t("email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white text-surface-900 text-sm outline-none"
                placeholder="vous@exemple.com" />
            </div>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading || !email}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
              {loading ? "..." : t("submit")}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-surface-500 mt-6">
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">{t("back")}</Link>
        </p>
      </div>
    </div>
  );
}
