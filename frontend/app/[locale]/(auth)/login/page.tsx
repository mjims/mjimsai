"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";
import { getApiError } from "@/lib/axios";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  remember: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const { setUser, setToken } = useAuth();
  const [apiError, setApiError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormData) {
    setApiError("");
    try {
      const res = await authService.login(values.email, values.password, !!values.remember);
      setToken(res.access_token);
      setUser(res.user);
      router.push("/dashboard");
    } catch (err) {
      // Email not verified → route to the OTP screen
      if (axios.isAxiosError(err) && err.response?.status === 403 && err.response?.data?.detail === "email_not_verified") {
        await authService.resendOtp(values.email).catch(() => {});
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      setApiError(getApiError(err));
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-2/5 bg-primary-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold">M</div>
          <span className="text-white font-bold text-xl">MjimsAI</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">Plateforme d&apos;Agents IA</h2>
          <p className="text-primary-200">Créez, configurez et déployez vos agents IA conversationnels.</p>
        </div>
        <div />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 lg:hidden">M</div>
            <h1 className="text-2xl font-bold text-surface-900">{t("title")}</h1>
            <p className="text-surface-500 mt-1">{t("subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">{t("email")}</label>
              <input {...register("email")} type="email" autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white text-surface-900 text-sm outline-none transition-all"
                placeholder="you@example.com" />
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">{t("password")}</label>
              <input {...register("password")} type="password" autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white text-surface-900 text-sm outline-none transition-all"
                placeholder="••••••••" />
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
              <input {...register("remember")} type="checkbox" className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-400" />
              {t("remember")}
            </label>

            {apiError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{apiError}</div>
            )}

            <button type="submit" disabled={isSubmitting}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
              {isSubmitting ? "..." : t("submit")}
            </button>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            {t("noAccount")}{" "}
            <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">{t("register")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
