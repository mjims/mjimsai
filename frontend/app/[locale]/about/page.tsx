import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Header from "@/components/header";
import MarketingFooter from "@/components/marketing/footer";
import { BotIcon, ShieldIcon, GlobeIcon } from "@/components/marketing/icons";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title"), description: t("subtitle") };
}

export default function AboutPage() {
  const t = useTranslations("about");
  const values = [
    { Icon: BotIcon, key: "v1" },
    { Icon: ShieldIcon, key: "v2" },
    { Icon: GlobeIcon, key: "v3" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <section className="px-4 pt-20 pb-14 sm:pt-28 bg-gradient-to-b from-primary-50/60 to-white">
        <div className="max-w-3xl mx-auto text-center animate-slide-up">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-surface-900 mb-5 tracking-tight">{t("title")}</h1>
          <p className="text-lg text-surface-500 leading-relaxed">{t("subtitle")}</p>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-surface-900 mb-3">{t("mission.title")}</h2>
          <p className="text-surface-600 leading-relaxed">{t("mission.body")}</p>
        </div>
      </section>

      <section className="px-4 py-14 bg-surface-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-surface-900 text-center mb-12">{t("values.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map(({ Icon, key }) => (
              <div key={key} className="bg-white rounded-2xl border border-surface-200 p-6">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-surface-900 mb-2">{t(`values.${key}.title`)}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{t(`values.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-surface-900 mb-3">{t("tech.title")}</h2>
          <p className="text-surface-600 leading-relaxed">{t("tech.body")}</p>
        </div>
      </section>

      <section className="py-16 px-4 bg-primary-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl font-bold text-white mb-6">{t("cta.title")}</h2>
          <Link href="/register"
            className="inline-block px-8 py-4 bg-white text-primary-700 font-semibold rounded-2xl hover:bg-primary-50 transition-colors cursor-pointer">
            {t("cta.button")}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
