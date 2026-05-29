import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MILA Open — Dashboard",
  description: "Plateforme d'agents IA customisables — Gérez vos agents, conversations et base de connaissances.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface-50 text-surface-900 antialiased">
        {children}
      </body>
    </html>
  );
}
