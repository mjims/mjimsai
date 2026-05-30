"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Header from "@/components/header";
import MarketingFooter from "@/components/marketing/footer";
import { contactService } from "@/services/contact.service";
import { getApiError } from "@/lib/axios";

type Field = "name" | "email" | "subject" | "message";

export default function ContactPage() {
  const t = useTranslations("contact");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", website: "" });
  const [touched, setTouched] = useState<Record<Field, boolean>>({ name: false, email: false, subject: false, message: false });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const errors: Record<Field, string | null> = {
    name: form.name.trim() ? null : t("errors.required"),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? null : t("errors.email"),
    subject: form.subject.trim() ? null : t("errors.required"),
    message: form.message.trim() ? null : t("errors.required"),
  };
  const isValid = !errors.name && !errors.email && !errors.subject && !errors.message;

  function set(field: Field | "website", value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, subject: true, message: true });
    if (!isValid) return;
    setSending(true);
    try {
      await contactService.send(form);
      setDone(true);
      toast.success(t("success"));
      setForm({ name: "", email: "", subject: "", message: "", website: "" });
    } catch (err) {
      toast.error(getApiError(err) || t("error"));
    } finally {
      setSending(false);
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm";
  const errCls = "mt-1 text-xs text-danger";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <section className="flex-1 px-4 py-16 sm:py-20">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl font-extrabold text-surface-900 mb-3 tracking-tight">{t("title")}</h1>
            <p className="text-surface-500">{t("subtitle")}</p>
          </div>

          {done ? (
            <div className="bg-white border border-surface-200 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">✓</div>
              <p className="text-surface-700">{t("success")}</p>
              <button onClick={() => setDone(false)} className="mt-5 text-sm font-medium text-primary-600 hover:text-primary-700 cursor-pointer">
                {t("again")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="bg-white border border-surface-200 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-surface-700 mb-1.5">{t("name")} *</label>
                  <input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => setTouched((s) => ({ ...s, name: true }))}
                    className={inputCls} autoComplete="name" />
                  {touched.name && errors.name && <p className={errCls}>{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-1.5">{t("email")} *</label>
                  <input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                    className={inputCls} autoComplete="email" />
                  {touched.email && errors.email && <p className={errCls}>{errors.email}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-surface-700 mb-1.5">{t("subject")} *</label>
                <input id="subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} onBlur={() => setTouched((s) => ({ ...s, subject: true }))}
                  className={inputCls} />
                {touched.subject && errors.subject && <p className={errCls}>{errors.subject}</p>}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-surface-700 mb-1.5">{t("message")} *</label>
                <textarea id="message" value={form.message} onChange={(e) => set("message", e.target.value)} onBlur={() => setTouched((s) => ({ ...s, message: true }))}
                  rows={5} className={`${inputCls} resize-y`} />
                {touched.message && errors.message && <p className={errCls}>{errors.message}</p>}
              </div>

              {/* Honeypot — hidden from real users */}
              <input
                type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
                value={form.website} onChange={(e) => set("website", e.target.value)}
                className="hidden" name="website"
              />

              <button type="submit" disabled={sending}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 cursor-pointer">
                {sending ? t("sending") : t("submit")}
              </button>
            </form>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
