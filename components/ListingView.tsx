"use client";

/**
 * Search & category listing with sidebar filters and sorting.
 * All filter state lives in the URL (?q=&brands=&stores=&min=&max=&stock=1&sort=)
 * so results are shareable and survive refresh.
 */
import { Check, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useCatalog } from "./CatalogProvider";
import { DynamicIcon } from "./DynamicIcon";
import { ProductCard } from "./ProductCard";
import { matchProducts } from "./SearchBox";
import { StoreLogo } from "./ui";
import { formatNumber } from "@/lib/format";
import { isPriceDrop, lowestPrice, marketDiscount, type OfferFilter } from "@/lib/pricing";
import type { Category } from "@/lib/types";
import { tr, pick } from "@/lib/i18n";

type SortKey = "price" | "discount" | "popular";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "price", label: tr("الأقل سعرًا") },
  { key: "discount", label: tr("الأعلى خصمًا") },
  { key: "popular", label: tr("الأكثر شعبية") },
];

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function ListingView({ category }: { category?: Category }) {
  const { catalog, categoryById } = useCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);

  const q = params.get("q") ?? "";
  const sort = (params.get("sort") as SortKey) || "popular";
  const brands = list(params.get("brands"));
  const storeIds = list(params.get("stores"));
  const cats = category ? [category.id] : list(params.get("cats"));
  const inStockOnly = params.get("stock") === "1";
  const dropsOnly = params.get("drops") === "1";
  const min = Number(params.get("min")) || 0;
  const max = Number(params.get("max")) || 0;

  /** Merge changes into the URL without scrolling to top. */
  function setParams(patch: Record<string, string | string[] | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      const value = Array.isArray(v) ? v.join(",") : v;
      if (!value) next.delete(k);
      else next.set(k, value);
    }
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  }
  const toggle = (key: string, arr: string[], id: string) =>
    setParams({ [key]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] });

  // Products in scope before facet filters (used to build the facet lists)
  const scoped = useMemo(() => {
    let items = q ? matchProducts(catalog, q) : catalog.products;
    if (cats.length) items = items.filter((p) => cats.includes(p.categoryId));
    return items;
  }, [catalog, q, cats.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const offerFilter: OfferFilter = { storeIds, inStockOnly };

  const results = useMemo(() => {
    const items = scoped.filter((p) => {
      if (brands.length && !brands.includes(p.brand)) return false;
      if (dropsOnly && !isPriceDrop(p)) return false;
      const lp = lowestPrice(p, offerFilter);
      if (!lp) return false; // no offer matches store / stock filters
      if (inStockOnly && !lp.inStock) return false;
      if (min && lp.price < min) return false;
      if (max && lp.price > max) return false;
      return true;
    });
    const price = (p: (typeof items)[number]) => lowestPrice(p, offerFilter)?.price ?? Infinity;
    return items.sort((a, b) =>
      sort === "price" ? price(a) - price(b) : sort === "discount" ? marketDiscount(b) - marketDiscount(a) : b.popularity - a.popularity,
    );
  }, [scoped, brands.join(), storeIds.join(), inStockOnly, dropsOnly, min, max, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandFacets = useMemo(() => [...new Set(scoped.map((p) => p.brand))].sort(), [scoped]);
  const storeFacets = useMemo(() => {
    const ids = new Set(scoped.flatMap((p) => p.offers.map((o) => o.storeId)));
    return catalog.stores.filter((s) => ids.has(s.id));
  }, [scoped, catalog.stores]);

  const activeCount = brands.length + storeIds.length + (inStockOnly ? 1 : 0) + (min || max ? 1 : 0) + (category ? 0 : cats.length) + (dropsOnly ? 1 : 0);

  const title = category ? pick(category.name, category.nameEn) : q ? tr("نتائج البحث عن “{q}”", { q }) : dropsOnly ? tr("منتجات نزلت أسعارها") : tr("كل المنتجات");

  const filters = (
    <div className="space-y-6">
      {/* Price range */}
      <fieldset>
        <legend className="mb-2 text-sm font-black">{tr("السعر (ج.م)")}</legend>
        <div className="flex items-center gap-2">
          <input
            key={`min-${min}`}
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={min || ""}
            placeholder={tr("من")}
            aria-label={tr("أقل سعر")}
            className="input"
            onBlur={(e) => setParams({ min: e.target.value || null })}
            onKeyDown={(e) => e.key === "Enter" && setParams({ min: (e.target as HTMLInputElement).value || null })}
          />
          <span className="text-slate-400">–</span>
          <input
            key={`max-${max}`}
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={max || ""}
            placeholder={tr("إلى")}
            aria-label={tr("أعلى سعر")}
            className="input"
            onBlur={(e) => setParams({ max: e.target.value || null })}
            onKeyDown={(e) => e.key === "Enter" && setParams({ max: (e.target as HTMLInputElement).value || null })}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            [0, 2000],
            [2000, 5000],
            [5000, 20000],
            [20000, 0],
          ].map(([a, b]) => (
            <button
              key={`${a}-${b}`}
              type="button"
              onClick={() => setParams({ min: a ? String(a) : null, max: b ? String(b) : null })}
              className={`chip border ${min === a && max === b ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-100" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
            >
              {b ? (a ? `${formatNumber(a)} – ${formatNumber(b)}` : tr("أقل من {n}", { n: formatNumber(b) })) : tr("أكثر من {n}", { n: formatNumber(a) })}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Availability */}
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
        <span className="text-sm font-bold">{tr("المتوفر فقط")}</span>
        <input type="checkbox" checked={inStockOnly} onChange={(e) => setParams({ stock: e.target.checked ? "1" : null })} className="size-5 accent-brand-600" />
      </label>

      {/* Category (only on search page) */}
      {!category && (
        <fieldset>
          <legend className="mb-2 text-sm font-black">{tr("القسم")}</legend>
          <div className="space-y-1">
            {catalog.categories.map((c) => (
              <CheckRow key={c.id} checked={cats.includes(c.id)} onChange={() => toggle("cats", cats, c.id)}>
                <DynamicIcon name={c.icon} className="size-4 text-slate-400" /> {pick(c.name, c.nameEn)}
              </CheckRow>
            ))}
          </div>
        </fieldset>
      )}

      {brandFacets.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-black">{tr("الماركة")}</legend>
          <div className="space-y-1">
            {brandFacets.map((b) => (
              <CheckRow key={b} checked={brands.includes(b)} onChange={() => toggle("brands", brands, b)}>
                <span className="ltr">{b}</span>
              </CheckRow>
            ))}
          </div>
        </fieldset>
      )}

      {storeFacets.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-black">{tr("المتجر")}</legend>
          <div className="space-y-1">
            {storeFacets.map((s) => (
              <CheckRow key={s.id} checked={storeIds.includes(s.id)} onChange={() => toggle("stores", storeIds, s.id)}>
                <StoreLogo store={s} size="sm" /> {pick(s.name, s.nameEn)}
              </CheckRow>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );

  const clearAll = () => setParams({ brands: null, stores: null, stock: null, min: null, max: null, cats: null, drops: null });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumbs */}
      <nav className="mb-3 text-xs text-slate-500" aria-label={tr("مسار التنقل")}>
        <Link href="/" className="hover:text-brand-600">{tr("الرئيسية")}</Link>
        <span className="mx-1.5">/</span>
        {category ? (
          <span>{categoryById(category.id)?.name}</span>
        ) : (
          <span>{tr("البحث")}</span>
        )}
      </nav>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
            {category && <DynamicIcon name={category.icon} className="size-7 text-brand-600" />}
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{tr("{n} منتج", { n: results.length })}</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button type="button" onClick={() => setSheet(true)} className="btn-ghost flex-1 lg:hidden">
            <SlidersHorizontal className="size-4" /> {tr("الفلاتر")}
            {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-[11px] text-white">{activeCount}</span>}
          </button>
          <label className="sr-only" htmlFor="sort">{tr("ترتيب حسب")}</label>
          <select id="sort" value={sort} onChange={(e) => setParams({ sort: e.target.value })} className="input h-[42px] flex-1 font-bold sm:w-48">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {tr("ترتيب:")} {tr(s.label)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="card sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-black">
                <SlidersHorizontal className="size-4" /> {tr("الفلاتر")}
              </h2>
              {activeCount > 0 && (
                <button type="button" onClick={clearAll} className="text-xs font-bold text-brand-600">{tr("مسح الكل")}</button>
              )}
            </div>
            {filters}
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          {results.length === 0 ? (
            <div className="card grid place-items-center gap-3 px-6 py-16 text-center">
              <p className="text-lg font-black">{tr("مفيش منتجات مطابقة")}</p>
              <p className="text-sm text-slate-500">{tr("جرب تشيل بعض الفلاتر أو تبحث بكلمة تانية.")}</p>
              {activeCount > 0 && (
                <button type="button" onClick={clearAll} className="btn-primary">{tr("مسح الفلاتر")}</button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} filter={offerFilter} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={tr("الفلاتر")}>
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <h2 className="font-black">{tr("الفلاتر")}</h2>
              <button type="button" onClick={() => setSheet(false)} aria-label={tr("إغلاق")} className="p-1">
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">{filters}</div>
            <div className="flex gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
              <button type="button" onClick={clearAll} className="btn-ghost">{tr("مسح")}</button>
              <button type="button" onClick={() => setSheet(false)} className="btn-primary flex-1">
                {tr("عرض {n} منتج", { n: results.length })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="grid size-5 shrink-0 place-items-center rounded-md border border-slate-300 text-white transition peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 dark:border-slate-600">
        <Check className={`size-3.5 ${checked ? "" : "invisible"}`} strokeWidth={3} />
      </span>
      <span className="flex min-w-0 items-center gap-2">{children}</span>
    </label>
  );
}
