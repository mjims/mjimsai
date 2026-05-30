import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Header from "@/components/header";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.hero" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-6 hover:shadow-card-hover transition-shadow duration-300">
      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-2xl mb-4">{icon}</div>
      <h3 className="font-semibold text-surface-900 mb-2">{title}</h3>
      <p className="text-sm text-surface-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Header />

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-24 bg-gradient-to-b from-primary-50/50 to-white">
        <div className="max-w-4xl mx-auto text-center animate-slide-up">
          <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wide">
            {t("hero.badge")}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-900 mb-6 leading-tight tracking-tight">
            {t("hero.title")}
          </h1>
          <p className="text-lg sm:text-xl text-surface-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register"
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-primary-600/25 hover:-translate-y-0.5">
              {t("hero.cta")}
            </Link>
            <Link href="/pricing"
              className="px-8 py-4 bg-white hover:bg-surface-50 text-surface-700 font-semibold rounded-2xl border border-surface-200 transition-colors">
              {t("hero.ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-surface-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-surface-900 text-center mb-12">{t("features.title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard icon="🤖" title={t("features.multiProvider.title")} desc={t("features.multiProvider.desc")} />
            <FeatureCard icon="🔌" title={t("features.widget.title")} desc={t("features.widget.desc")} />
            <FeatureCard icon="📚" title={t("features.knowledge.title")} desc={t("features.knowledge.desc")} />
            <FeatureCard icon="📊" title={t("features.analytics.title")} desc={t("features.analytics.desc")} />
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4 bg-primary-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t("hero.title")}</h2>
          <p className="text-primary-200 mb-8">{t("hero.subtitle")}</p>
          <Link href="/register"
            className="inline-block px-8 py-4 bg-white text-primary-700 font-semibold rounded-2xl hover:bg-primary-50 transition-colors">
            {t("hero.cta")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-900 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">M</div>
            <span className="font-bold">MjimsAI</span>
          </div>
          <p className="text-surface-400 text-sm">© {new Date().getFullYear()} MjimsAI. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/pricing" className="text-surface-400 hover:text-white text-sm transition-colors">Tarifs</Link>
            <Link href="/about" className="text-surface-400 hover:text-white text-sm transition-colors">À propos</Link>
            <Link href="/contact" className="text-surface-400 hover:text-white text-sm transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
