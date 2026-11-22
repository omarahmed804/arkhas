"use client";

/** Unified product page: gallery, specs, best-price badge, store comparison, history, alert. */
import { Bell, ChevronLeft, Crown, Store as StoreIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCatalog } from "../CatalogProvider";
import { ProductCard } from "../ProductCard";
import { ProductImage, StoreLogo } from "../ui";
import { OfferCtaButton, OfferList } from "./OfferList";
import { PriceAlertModal } from "./PriceAlertModal";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { formatEGP, storesCountLabel } from "@/lib/format";
import { bestOffer, inStockStoreCount, sortOffers } from "@/lib/pricing";

export function ProductView({ slug }: { slug: string }) {
  const { productBySlug, categoryById, storeById, catalog, hydrated } = useCatalog();
  const [imgIndex, setImgIndex] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const product = productBySlug(slug);

  if (!product) {
    // Product may exist only in this browser's admin data → wait for hydration.
    if (!hydrated) return <div className="mx-auto h-96 max-w-7xl animate-pulse px-4 py-6"><div className="card size-full" /></div>;
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-black">المنتج غير موجود</h1>
        <p className="mt-2 text-slate-500">ممكن يكون اتشال أو الرابط غلط.</p>
        <Link href="/search" className="btn-primary mt-6">تصفح كل المنتجات</Link>
      </div>
    );
  }

  const category = categoryById(product.categoryId);
  const best = bestOffer(product);
  const bestStore = best ? storeById(best.storeId) : undefined;
  const inStockOffers = sortOffers(product.offers).filter((o) => o.inStock);
  const highest = inStockOffers.at(-1);
  const savings = best && highest ? highest.price - best.price : 0;
  const imageCount = Math.max(1, product.images.length);
  const related = catalog.products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500" aria-label="مسار التنقل">
        <Link href="/" className="hover:text-brand-600">الرئيسية</Link>
        <ChevronLeft className="size-3" />
        {category && (
          <>
            <Link href={`/category/${category.slug}`} className="hover:text-brand-600">{category.name}</Link>
            <ChevronLeft className="size-3" />
          </>
        )}
        <span className="ltr truncate">{product.name}</span>
      </nav>

      {/* Top section */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Gallery */}
        <div>
          <ProductImage product={product} index={imgIndex} className="card aspect-[4/3] w-full" iconSize="size-28" />
          {imageCount > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImgIndex(i)}
                  aria-label={`صورة ${i + 1}`}
                  className={`shrink-0 overflow-hidden rounded-xl ring-2 transition ${i === imgIndex ? "ring-brand-600" : "ring-transparent opacity-70 hover:opacity-100"}`}
                >
                  <ProductImage product={product} index={i} className="size-16 sm:size-20" iconSize="size-6" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="chip bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{product.brand}</span>
              {category && <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-100">{category.name}</span>}
            </div>
            <h1 className="ltr text-start text-2xl font-black leading-snug sm:text-3xl">{product.name}</h1>
            {product.nameAr && <p className="mt-1 text-slate-500">{product.nameAr}</p>}
          </div>

          {/* Best price badge */}
          {best && bestStore ? (
            <div className="rounded-2xl border-2 border-deal-500 bg-deal-50 p-4 dark:bg-deal-500/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold text-deal-700 dark:text-deal-500">
                    <Crown className="size-4" /> أفضل سعر الآن
                  </p>
                  <p className="text-3xl font-black text-deal-700 dark:text-deal-500">{formatEGP(best.price)}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm">
                    في <StoreLogo store={bestStore} size="sm" /> <span className="font-bold">{bestStore.name}</span>
                  </p>
                </div>
                {savings > 0 && (
                  <span className="chip bg-deal-500 py-1.5 text-sm text-white">وفّر لحد {formatEGP(savings)}</span>
                )}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <OfferCtaButton offer={best} product={product} className="w-full py-3" />
                <button type="button" onClick={() => setAlertOpen(true)} className="btn-ghost w-full py-3">
                  <Bell className="size-4" /> نبهني لما السعر ينزل
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="font-bold">غير متوفر حاليًا في أي متجر</p>
              <button type="button" onClick={() => setAlertOpen(true)} className="btn-primary mt-3 w-full">
                <Bell className="size-4" /> نبهني لما يتوفر بسعر كويس
              </button>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <StoreIcon className="size-4" /> {storesCountLabel(inStockStoreCount(product))} من أصل {product.offers.length}
          </p>

          {/* Key specs */}
          {product.specs.length > 0 && (
            <dl className="grid grid-cols-2 gap-2">
              {product.specs.slice(0, 4).map((s) => (
                <div key={s.label} className="rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                  <dt className="text-[11px] text-slate-500">{s.label}</dt>
                  <dd className="ltr mt-0.5 text-start text-sm font-bold">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {/* Comparison */}
      <section className="mt-10">
        <h2 className="mb-1 text-xl font-black">مقارنة الأسعار في {product.offers.length} متاجر</h2>
        <p className="mb-4 text-sm text-slate-500">مرتبة من الأرخص للأغلى (المنتجات الغير متوفرة في الآخر).</p>
        <OfferList product={product} />
        <p className="mt-2 text-xs text-slate-400">ممكن نحصل على عمولة لو اشتريت من خلال الروابط، من غير ما ده يأثر على السعر.</p>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <PriceHistoryChart product={product} />
        {product.specs.length > 0 && (
          <section className="card p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-black">المواصفات</h2>
            <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {product.specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">{s.label}</dt>
                  <dd className="ltr text-end font-bold">{s.value}</dd>
                </div>
              ))}
            </dl>
            {product.description && <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">{product.description}</p>}
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-black">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {alertOpen && <PriceAlertModal product={product} currentPrice={best?.price} onClose={() => setAlertOpen(false)} />}
    </div>
  );
}
