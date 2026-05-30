import { useTranslations } from "next-intl";
import Link from "next/link";

export default function MarketingFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="bg-surface-900 text-surface-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
              <span className="font-bold text-lg">MjimsAI</span>
            </Link>
            <p className="mt-3 text-sm text-surface-400 leading-relaxed max-w-xs">{t("tagline")}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">{t("product")}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" className="hover:text-white transition-colors">{nav("pricing")}</Link></li>
              <li><Link href="/#features" className="hover:text-white transition-colors">{t("features")}</Link></li>
              <li><Link href="/#how" className="hover:text-white transition-colors">{t("how")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">{t("company")}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">{nav("about")}</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{nav("contact")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">{t("account")}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">{nav("login")}</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">{nav("getStarted")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-surface-800 text-sm text-surface-400">
          © {new Date().getFullYear()} MjimsAI. {t("rights")}
        </div>
      </div>
    </footer>
  );
}
