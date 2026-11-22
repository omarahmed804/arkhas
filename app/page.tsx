"use client";

import { ArrowLeft, BadgeCheck, Bell, LineChart, Sparkles, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useCatalog } from "@/components/CatalogProvider";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ProductCard } from "@/components/ProductCard";
import { SearchBox } from "@/components/SearchBox";
import { StoreLogo } from "@/components/ui";
import { marketDiscount } from "@/lib/pricing";

export default function HomePage() {
  const { catalog } = useCatalog();

  // "Today's Best Deals": biggest discount vs. average market price
  const deals = useMemo(
    () =>
      [...catalog.products]
        .map((p) => ({ p, d: marketDiscount(p) }))
        .filter((x) => x.d > 0)
        .sort((a, b) => b.d - a.d)
        .slice(0, 8)
        .map((x) => x.p),
    [catalog.products],
  );

  const categories = useMemo(() => [...catalog.categories].sort((a, b) => a.sortOrder - b.sortOrder), [catalog.categories]);
  const featuredStores = catalog.stores.filter((s) => s.featured);
  const quickSearches = ["PS5", "Switch 2", "RTX 5060", "DualSense", "FC 26"];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto size-[36rem] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 py-12 text-center sm:py-20">
          <span className="chip mb-4 bg-deal-50 text-deal-700 dark:bg-deal-500/10 dark:text-deal-500">
            <Sparkles className="size-3.5" /> أسعار {catalog.stores.length} متاجر في مكان واحد
          </span>
          <h1 className="text-3xl font-black leading-tight sm:text-5xl sm:leading-tight">
            قارن الأسعار بين أشهر ستورز الجيمينج في مصر{" "}
            <span className="bg-gradient-to-l from-brand-600 to-deal-500 bg-clip-text text-transparent">واشتري بالأرخص</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">
            صفحة واحدة لكل منتج فيها أسعار كل المتاجر، وتاريخ السعر عشان تعرف العرض الحقيقي من الوهمي.
          </p>
          <div className="mx-auto mt-8 max-w-2xl text-start">
            <SearchBox size="lg" />
          </div>
          <div className="no-scrollbar mt-4 flex justify-center gap-2 overflow-x-auto">
            {quickSearches.map((q) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="chip shrink-0 border border-slate-200 bg-white py-1.5 text-slate-600 hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10">
        {/* Today's best deals */}
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black">
                <TrendingDown className="size-6 text-deal-500" /> أقوى عروض اليوم
              </h2>
              <p className="mt-1 text-sm text-slate-500">أعلى نسبة توفير مقارنة بمتوسط سعر السوق</p>
            </div>
            <Link href="/search?sort=discount" className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-600">
              الكل <ArrowLeft className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {deals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Categories */}
        <section>
          <h2 className="mb-5 text-2xl font-black">الأقسام الأكثر بحثًا</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => {
              const count = catalog.products.filter((p) => p.categoryId === c.id).length;
              return (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="card group flex items-center gap-3 p-4 transition hover:border-brand-500/50 hover:shadow-md"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-slate-800 dark:text-brand-100">
                    <DynamicIcon name={c.icon} className="size-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{c.name}</span>
                    <span className="text-xs text-slate-500">{count} منتج</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Featured stores */}
        <section>
          <h2 className="mb-5 text-2xl font-black">بنقارن أسعار</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {featuredStores.map((s) => (
              <div key={s.id} className="card flex shrink-0 items-center gap-3 px-4 py-3">
                <StoreLogo store={s} />
                <div>
                  <p className="text-sm font-bold">{s.name}</p>
                  {s.trusted && (
                    <p className="flex items-center gap-1 text-xs text-brand-600">
                      <BadgeCheck className="size-3.5" /> موثوق
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: TrendingDown, t: "قارن في ثانية", d: "كل أسعار المتاجر مرتبة من الأرخص للأغلى في صفحة واحدة." },
            { icon: LineChart, t: "اكشف العروض الوهمية", d: "تاريخ السعر لآخر 30 يوم يوضحلك لو الخصم حقيقي." },
            { icon: Bell, t: "نبهني لما السعر ينزل", d: "حدد السعر اللي يناسبك وهنبعتلك أول ما يوصله." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card p-5">
              <Icon className="mb-3 size-7 text-brand-600" />
              <h3 className="font-black">{t}</h3>
              <p className="mt-1 text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
