"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

export default function Header() {
  const nav = useTranslations("nav");

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
          <span className="font-bold text-surface-900 text-lg">MjimsAI</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/pricing" className="text-sm text-surface-600 hover:text-surface-900 font-medium transition-colors">{nav("pricing")}</Link>
          <Link href="/about" className="text-sm text-surface-600 hover:text-surface-900 font-medium transition-colors">{nav("about")}</Link>
          <Link href="/contact" className="text-sm text-surface-600 hover:text-surface-900 font-medium transition-colors">{nav("contact")}</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-surface-700 hover:text-surface-900 transition-colors">{nav("login")}</Link>
          <Link href="/register" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
            {nav("getStarted")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
