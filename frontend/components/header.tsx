"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { MenuIcon, CloseIcon } from "@/components/marketing/icons";

export default function Header() {
  const nav = useTranslations("nav");
  const [open, setOpen] = useState(false);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = (
    <>
      <Link href="/pricing" className="text-sm text-surface-600 hover:text-surface-900 font-medium transition-colors">{nav("pricing")}</Link>
      <Link href="/about" className="text-sm text-surface-600 hover:text-surface-900 font-medium transition-colors">{nav("about")}</Link>
      <Link href="/contact" className="text-sm text-surface-600 hover:text-surface-900 font-medium transition-colors">{nav("contact")}</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
          <span className="font-bold text-surface-900 text-lg">MjimsAI</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">{links}</div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-surface-700 hover:text-surface-900 transition-colors">{nav("login")}</Link>
          <Link href="/register" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
            {nav("getStarted")}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-surface-700 hover:text-surface-900 rounded-lg cursor-pointer"
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-surface-100 bg-white animate-fade-in">
          <div className="px-4 py-4 flex flex-col gap-1">
            <div className="flex flex-col gap-1 [&>a]:py-3 [&>a]:px-2 [&>a]:rounded-lg [&>a]:hover:bg-surface-50" onClick={() => setOpen(false)}>
              {links}
            </div>
            <div className="mt-2 pt-3 border-t border-surface-100 flex flex-col gap-2">
              <Link href="/login" onClick={() => setOpen(false)} className="py-3 px-2 text-sm font-medium text-surface-700 rounded-lg hover:bg-surface-50">{nav("login")}</Link>
              <Link href="/register" onClick={() => setOpen(false)} className="py-3 text-center bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
                {nav("getStarted")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
