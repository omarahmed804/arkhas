import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { CatalogProvider } from "@/components/CatalogProvider";
import { Header, Logo } from "@/components/Header";
import { PwaInstall } from "@/components/PwaInstall";
import { PromoBar } from "@/components/PromoBar";
import { LangProvider, T } from "@/components/LangProvider";
import { langInitScript } from "@/lib/i18n";

// Runs before paint (dark mode). Kept here, not in the "use client" ThemeToggle file,
// because a server component can't read strings exported from a client module.
const themeInitScript = `(function(){try{var t=localStorage.getItem('arkhas:theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export const metadata: Metadata = {
  title: { default: "أرخص — قارن الأسعار في مصر واشتري بالأرخص", template: "%s | أرخص" },
  description: "قارن أسعار الموبايلات واللابتوبات والسماعات والألعاب وكروت الشحن بين أشهر المتاجر في مصر: أمازون، نون، جوميا، 2B، دريم 2000 وغيرهم.",
  applicationName: "أرخص",
  appleWebApp: { capable: true, title: "أرخص", statusBarStyle: "default" },
  formatDetection: { telephone: false },
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
        {/* ⚠️ أكواد التأكيد — متمسحهاش */}
        <meta name="google-site-verification" content="I8Mv7jV5RHdv5-q5S7TSuQpVC0SQ69LGJAfzdpeEoAE" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + langInitScript }} />
        {/* Cairo — modern Arabic font that also renders Latin product names cleanly */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-dvh font-sans">
        <LangProvider>
        <CatalogProvider>
          <PromoBar />
          <Header />
          <main className="min-h-[70vh]">{children}</main>
          <footer className="mt-16 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Logo />
                <p><T>الأسعار بتتحدث باستمرار، لكن السعر النهائي هو اللي في صفحة المتجر.</T></p>
                <p className="text-xs"><T>بعض الروابط روابط أفلييت: بصفتنا مشاركين في برنامج Amazon Associates وبرامج تانية، ممكن ناخد عمولة من المشتريات المؤهلة من غير ما السعر يزيد عليك.</T></p>
              </div>
              <nav className="flex flex-wrap gap-x-4 gap-y-2 font-bold">
                <Link href="/search" className="hover:text-brand-600"><T>كل المنتجات</T></Link>
                <Link href="/search?sort=discount" className="hover:text-brand-600"><T>العروض</T></Link>
                <Link href="/about" className="hover:text-brand-600"><T>من نحن</T></Link>
                <Link href="/contact" className="hover:text-brand-600"><T>تواصل معنا</T></Link>
                <Link href="/privacy" className="hover:text-brand-600"><T>سياسة الخصوصية</T></Link>
              </nav>
            </div>
          </footer>
          <PwaInstall />
        </CatalogProvider>
        </LangProvider>
      </body>
    </html>
  );
}
