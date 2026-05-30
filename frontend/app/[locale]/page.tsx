import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Header from "@/components/header";
import MarketingFooter from "@/components/marketing/footer";
import {
  BotIcon, PlugIcon, BookIcon, ChartIcon, WhatsAppIcon, MicIcon, CheckIcon,
} from "@/components/marketing/icons";
import type { ComponentType, SVGProps } from "react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.hero" });
  return { title: t("title"), description: t("subtitle") };
}

const PROVIDERS = ["Claude", "GPT-4o", "Gemini", "Grok", "DeepSeek"];

function FeatureCard({ Icon, title, desc }: { Icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-6 hover:shadow-card-hover hover:border-primary-200 transition-all duration-200">
      <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-semibold text-surface-900 mb-2">{title}</h3>
      <p className="text-sm text-surface-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("home");
  const faqItems = t.raw("faq.items") as { q: string; a: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero */}
      <section className="px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 bg-gradient-to-b from-primary-50/60 via-white to-white">
        <div className="max-w-5xl mx-auto text-center animate-slide-up">
          <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wide">
            {t("hero.badge")}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-900 mb-6 leading-[1.1] tracking-tight">
            {t("hero.title")}
          </h1>
          <p className="text-lg sm:text-xl text-surface-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register"
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-primary-600/25 hover:-translate-y-0.5 cursor-pointer">
              {t("hero.cta")}
            </Link>
            <Link href="/pricing"
              className="px-8 py-4 bg-white hover:bg-surface-50 text-surface-700 font-semibold rounded-2xl border border-surface-200 transition-colors cursor-pointer">
              {t("hero.ctaSecondary")}
            </Link>
          </div>

          {/* Trust bar */}
          <div className="mt-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-4">{t("trust.title")}</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {PROVIDERS.map((p) => (
                <span key={p} className="text-surface-500 font-semibold text-sm sm:text-base">{p}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Product mockup */}
        <div className="max-w-md mx-auto mt-16">
          <div className="rounded-2xl border border-surface-200 shadow-card-hover overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-4 py-3 bg-surface-900">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">M</div>
              <span className="text-white text-sm font-medium">MjimsAI</span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-surface-300">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />{t("mockup.online")}
              </span>
            </div>
            <div className="p-4 space-y-3 bg-surface-50">
              <div className="flex justify-end">
                <p className="max-w-[80%] bg-primary-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5">{t("mockup.user")}</p>
              </div>
              <div className="flex justify-start">
                <p className="max-w-[85%] bg-white border border-surface-200 text-surface-700 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5">{t("mockup.bot")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-24 px-4 bg-surface-50 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-surface-900 text-center mb-4">{t("features.title")}</h2>
          <p className="text-surface-500 text-center mb-12 max-w-2xl mx-auto">{t("features.subtitle")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard Icon={BotIcon} title={t("features.multiProvider.title")} desc={t("features.multiProvider.desc")} />
            <FeatureCard Icon={PlugIcon} title={t("features.widget.title")} desc={t("features.widget.desc")} />
            <FeatureCard Icon={BookIcon} title={t("features.knowledge.title")} desc={t("features.knowledge.desc")} />
            <FeatureCard Icon={ChartIcon} title={t("features.analytics.title")} desc={t("features.analytics.desc")} />
            <FeatureCard Icon={WhatsAppIcon} title={t("features.whatsapp.title")} desc={t("features.whatsapp.desc")} />
            <FeatureCard Icon={MicIcon} title={t("features.voice.title")} desc={t("features.voice.desc")} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 sm:py-24 px-4 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-surface-900 text-center mb-4">{t("how.title")}</h2>
          <p className="text-surface-500 text-center mb-14 max-w-2xl mx-auto">{t("how.subtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {["step1", "step2", "step3"].map((s, i) => (
              <div key={s} className="relative">
                <div className="w-11 h-11 rounded-xl bg-primary-600 text-white font-display font-bold flex items-center justify-center mb-4">{i + 1}</div>
                <h3 className="font-semibold text-surface-900 mb-2">{t(`how.${s}.title`)}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{t(`how.${s}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof / stats */}
      <section className="py-16 px-4 bg-surface-900">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {["s1", "s2", "s3"].map((s) => (
              <div key={s}>
                <p className="font-display text-4xl font-extrabold text-white mb-1">{t(`stats.${s}.value`)}</p>
                <p className="text-sm text-surface-400">{t(`stats.${s}.label`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-surface-900 text-center mb-12">{t("faq.title")}</h2>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <details key={i} className="group bg-white border border-surface-200 rounded-xl px-5 py-4 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between gap-4 font-medium text-surface-900 list-none">
                  {item.q}
                  <span className="text-surface-400 transition-transform duration-200 group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-surface-500 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-primary-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">{t("finalCta.title")}</h2>
          <p className="text-primary-100 mb-8">{t("finalCta.subtitle")}</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-semibold rounded-2xl hover:bg-primary-50 transition-colors cursor-pointer">
            <CheckIcon className="w-5 h-5" />{t("finalCta.cta")}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
