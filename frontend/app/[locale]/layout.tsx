import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AuthProvider } from "@/context/AuthContext";
import type { ReactNode } from "react";
import { Toaster } from 'sonner';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: {
    template: "%s | MjimsAI",
    default: "MjimsAI — Plateforme d'Agents IA",
  },
  description: "Créez, personnalisez et déployez des agents IA conversationnels sur n'importe quel site web. Multi-provider, multilingue, SaaS.",
  openGraph: {
    type: "website",
    siteName: "MjimsAI",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface-50 text-surface-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
