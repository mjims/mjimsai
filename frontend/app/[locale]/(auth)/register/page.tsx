"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authService } from "@/services/auth.service";
import { getApiError } from "@/lib/axios";

const schema = z.object({
  first_name: z.string().min(1, "Requis").max(100),
  last_name: z.string().min(1, "Requis").max(100),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Min 8 caractères"),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const [apiError, setApiError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormData) {
    setApiError("");
    try {
      await authService.register(values);
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      setApiError(getApiError(err));
    }
  }

  const fields = [
    { name: "first_name" as const, label: t("firstName"), type: "text", placeholder: "Jean", autoComplete: "given-name" },
    { name: "last_name" as const, label: t("lastName"), type: "text", placeholder: "Dupont", autoComplete: "family-name" },
    { name: "email" as const, label: t("email"), type: "email", placeholder: "vous@exemple.com", autoComplete: "email" },
    { name: "password" as const, label: t("password"), type: "password", placeholder: "••••••••", autoComplete: "new-password" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">M</div>
          <h1 className="text-2xl font-bold text-surface-900">{t("title")}</h1>
          <p className="text-surface-500 mt-1">{t("subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {fields.map(({ name, label, type, placeholder, autoComplete }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">{label}</label>
                <input
                  {...register(name)}
                  type={type}
                  placeholder={placeholder}
                  autoComplete={autoComplete}
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white text-surface-900 text-sm outline-none transition-all"
                />
                {errors[name] && <p className="text-danger text-xs mt-1">{errors[name]?.message}</p>}
              </div>
            ))}

            {apiError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{apiError}</div>
            )}

            <button type="submit" disabled={isSubmitting}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors mt-2">
              {isSubmitting ? "..." : t("submit")}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-surface-500 mt-6">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">{t("login")}</Link>
        </p>
      </div>
    </div>
  );
}
