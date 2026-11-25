"use client";

import { ChevronDown, LayoutGrid, Menu, TrendingDown, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCatalog } from "./CatalogProvider";
import { DynamicIcon } from "./DynamicIcon";
import { SearchBox } from "./SearchBox";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "./LangProvider";
import { FavHeaderLink } from "./Favorites";
import { isPriceDrop } from "@/lib/pricing";
import { tr, pick, isEn } from "@/lib/i18n";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={tr("أرخص — الصفحة الرئيسية")}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30">
        <TrendingDown className="size-5" strokeWidth={2.5} />
      </span>
      <span className="text-xl font-black tracking-tight">
        {tr("أرخص")}<span className="text-deal-500">.</span>
      </span>
    </Link>
  );
}

/** Categories grouped by industry — fully data-driven. */
function useGroupedCategories() {
  const { catalog } = useCatalog();
  return useMemo(
    () =>
      [...catalog.industries]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ind) => ({
          industry: ind,
          categories: catalog.categories.filter((c) => c.industryId === ind.id).sort((a, b) => a.sortOrder - b.sortOrder),
        }))
        .filter((g) => g.categories.length),
    [catalog],
  );
}

function CategoryLinks({ onNavigate }: { onNavigate?: () => void }) {
  const groups = useGroupedCategories();
  return (
    <div className="space-y-3">
      {groups.map(({ industry, categories }) => (
        <div key={industry.id}>
          {groups.length > 1 && <p className="px-2 pb-1 text-xs font-bold text-slate-400">{pick(industry.name, industry.nameEn)}</p>}
          <div className="grid gap-0.5">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-bold transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-100">
                  <DynamicIcon name={c.icon} className="size-4" />
                </span>
                {pick(c.name, c.nameEn)}
                {!isEn() && <span className="ltr ms-auto text-xs font-medium text-slate-400">{c.nameEn}</span>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="btn-ghost h-10 border-transparent bg-transparent px-3 dark:bg-transparent"
      >
        <LayoutGrid className="size-4" /> {tr("الأقسام")} <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="card absolute start-0 top-full z-50 mt-2 w-80 p-2 shadow-xl">
          <CategoryLinks onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

function PriceDropsBadge({ compact = false }: { compact?: boolean }) {
  const { catalog } = useCatalog();
  const count = catalog.products.filter(isPriceDrop).length;
  return (
    <Link
      href="/search?sort=discount&drops=1"
      className="relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-deal-50 px-3 text-sm font-bold text-deal-700 transition hover:bg-deal-100 dark:bg-deal-500/10 dark:text-deal-500"
    >
      <TrendingDown className="size-4" />
      {!compact && <span>{tr("نزلت أسعارها")}</span>}
      {count > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-deal-500 px-1 text-[11px] leading-5 text-white">{count}</span>
      )}
    </Link>
  );
}

export function Header() {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  useEffect(() => setDrawer(false), [pathname]);
  // Lock page scroll while the drawer is open.
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label={tr("القائمة")}
          className="grid size-10 place-items-center rounded-xl hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
        >
          <Menu className="size-5" />
        </button>
        <Logo />
        <CategoryDropdown />
        <div className="hidden flex-1 md:block md:max-w-xl">
          <SearchBox />
        </div>
        <div className="ms-auto flex items-center gap-1.5">
          <span className="sm:hidden">
            <PriceDropsBadge compact />
          </span>
          <span className="hidden sm:inline-flex">
            <PriceDropsBadge />
          </span>
          <FavHeaderLink />
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
      {/* Mobile search row */}
      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>

      {/* Mobile drawer */}
      {/* Portal to <body>: the header's backdrop-blur would otherwise trap a
          position:fixed drawer inside the header's own height on mobile. */}
      {drawer && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={tr("الأقسام")}>
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawer(false)} />
          <nav className="absolute inset-y-0 start-0 flex h-dvh w-[85%] max-w-sm flex-col overflow-y-auto overscroll-contain bg-white p-4 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setDrawer(false)} aria-label={tr("إغلاق")} className="grid size-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-2 px-2 text-sm font-black">{tr("الأقسام")}</p>
            <CategoryLinks onNavigate={() => setDrawer(false)} />
            <div className="mt-auto border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
              <Link href="/search" className="block rounded-xl px-2 py-2 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">{tr("كل المنتجات")}</Link>
              <Link href="/search?sort=discount" className="block rounded-xl px-2 py-2 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">{tr("أقوى العروض")}</Link>
              <Link href="/favorites" className="block rounded-xl px-2 py-2 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">♡ {tr("المفضلة")}</Link>
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </header>
  );
}
