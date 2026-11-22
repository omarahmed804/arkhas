import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { CatalogProvider } from "@/components/CatalogProvider";
import { Header, Logo } from "@/components/Header";
import { themeInitScript } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: { default: "أرخص — قارن أسعار الجيمينج والإلكترونيات في مصر", template: "%s | أرخص" },
  description: "قارن الأسعار بين أشهر ستورز الجيمينج في مصر واشتري بالأرخص: أمازون، نون، سيجما، البدر وغيرهم.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Cairo — modern Arabic font that also renders Latin product names cleanly */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-dvh font-sans">
        <CatalogProvider>
          <Header />
          <main className="min-h-[70vh]">{children}</main>
          <footer className="mt-16 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Logo />
                <p>الأسعار بتتحدث باستمرار، لكن السعر النهائي هو اللي في صفحة المتجر.</p>
              </div>
              <nav className="flex gap-4 font-bold">
                <Link href="/search" className="hover:text-brand-600">كل المنتجات</Link>
                <Link href="/search?sort=discount" className="hover:text-brand-600">العروض</Link>
              </nav>
            </div>
          </footer>
        </CatalogProvider>
      </body>
    </html>
  );
}
