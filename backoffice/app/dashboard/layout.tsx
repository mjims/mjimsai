"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { adminService } from "@/services/admin.service";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", exact: true },
  { href: "/dashboard/plans", label: "Plans", icon: "💳" },
  { href: "/dashboard/models", label: "Modèles IA", icon: "🧠" },
  { href: "/dashboard/payments", label: "Paiements", icon: "💰" },
  { href: "/dashboard/users", label: "Utilisateurs", icon: "👥" },
  { href: "/dashboard/admins", label: "Admins", icon: "🛡️" },
  { href: "/dashboard/profile", label: "Mon profil", icon: "👤" },
  { href: "/dashboard/system", label: "Système", icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!adminService.isAuthenticated()) router.replace("/login");
  }, [router]);

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen flex bg-surface-50">
      <aside className="w-60 bg-surface-900 flex flex-col">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-700">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">MjimsAI</p>
            <p className="text-surface-400 text-xs">Admin</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive(item.href, item.exact) ? "bg-primary-600 text-white" : "text-surface-400 hover:bg-surface-800 hover:text-white"}`}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-surface-700">
          <button onClick={() => adminService.logout()}
            className="w-full py-2.5 px-4 text-sm text-surface-400 hover:text-white hover:bg-surface-800 rounded-xl transition-colors text-left">
            → Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
