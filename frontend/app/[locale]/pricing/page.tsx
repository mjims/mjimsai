import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Header from "@/components/header";
import MarketingFooter from "@/components/marketing/footer";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: t("title"), description: t("subtitle") };
}

const PLANS = [
  { key: "free", convLimit: 100, eur: 0, xof: 0, featured: false, agentLimit: 1 },
  { key: "starter", convLimit: 2000, eur: 29, xof: 17000, featured: false, agentLimit: 5 },
  { key: "pro", convLimit: 10000, eur: 99, xof: 65000, featured: true, agentLimit: -1 },
  { key: "enterprise", convLimit: -1, eur: null, xof: null, featured: false, agentLimit: -1 },
];

export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-surface-900 mb-4">{t("title")}</h1>
            <p className="text-lg text-surface-500">{t("subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.key}
                className={`relative bg-white rounded-2xl border p-6 flex flex-col ${plan.featured ? "border-primary-500 shadow-lg shadow-primary-500/10" : "border-surface-200"}`}>
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">
                    {t("popular")}
                  </span>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-surface-900 text-lg capitalize">{plan.key}</h3>
                  <div className="mt-4">
                    {plan.eur === null ? (
                      <p className="text-2xl font-bold text-surface-900">Sur mesure</p>
                    ) : plan.eur === 0 ? (
                      <p className="text-2xl font-bold text-surface-900">{t("free")}</p>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold text-surface-900">{plan.eur}€<span className="text-sm font-normal text-surface-500">{t("perMonth")}</span></p>
                        <p className="text-sm text-surface-400">{plan.xof?.toLocaleString()} XOF{t("perMonth")}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-surface-500 mt-2">
                    {plan.convLimit === -1 ? t("unlimited") : `${plan.convLimit.toLocaleString()} ${t("conversations")}`}
                  </p>
                </div>
                <div className="flex-1" />
                {plan.key === "enterprise" ? (
                  <Link href="/contact" className="block text-center py-3 rounded-xl border border-surface-300 text-surface-700 hover:border-primary-400 hover:text-primary-700 font-medium transition-colors text-sm">
                    {t("ctaEnterprise")}
                  </Link>
                ) : (
                  <Link href="/register"
                    className={`block text-center py-3 rounded-xl font-medium text-sm transition-colors ${plan.featured ? "bg-primary-600 hover:bg-primary-700 text-white" : "bg-primary-50 hover:bg-primary-100 text-primary-700"}`}>
                    {t("cta")}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
