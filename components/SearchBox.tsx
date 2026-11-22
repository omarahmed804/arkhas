"use client";

/** Live search with instant autocomplete (keyboard accessible). */
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { useCatalog } from "./CatalogProvider";
import { ProductImage } from "./ui";
import { formatEGP } from "@/lib/format";
import { lowestPrice } from "@/lib/pricing";
import type { Catalog, Product } from "@/lib/types";

/** Normalizes Arabic letter variants so "اكس بوكس" matches "إكس بوكس". */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ً-ْ]/g, "")
    .trim();
}

export function matchProducts(catalog: Catalog, query: string): Product[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const catName = new Map(catalog.categories.map((c) => [c.id, `${c.name} ${c.nameEn}`]));
  return catalog.products.filter((p) => {
    const hay = normalize(`${p.name} ${p.nameAr ?? ""} ${p.brand} ${catName.get(p.categoryId) ?? ""}`);
    return terms.every((t) => hay.includes(t));
  });
}

export function SearchBox({ size = "md", autoFocus = false }: { size?: "md" | "lg"; autoFocus?: boolean }) {
  const { catalog } = useCatalog();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => matchProducts(catalog, q).slice(0, 6), [catalog, q]);
  const showList = open && q.trim().length > 0;

  function go(path: string) {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(path);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && results[active]) return go(`/product/${results[active].slug}`);
    if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const big = size === "lg";

  return (
    <form role="search" onSubmit={onSubmit} className="relative w-full">
      <div className="relative">
        <Search className={`pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 ${big ? "size-5" : "size-4"}`} />
        <input
          ref={inputRef}
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="ابحث عن منتج… مثلاً RTX 5060 أو دراع PS5"
          aria-label="بحث عن منتج"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          className={`input [&::-webkit-search-cancel-button]:hidden ${big ? "h-14 rounded-2xl ps-11 pe-28 text-base shadow-lg shadow-brand-600/5" : "h-10 ps-9 pe-9"}`}
        />
        {q && !big && (
          <button type="button" onClick={() => setQ("")} aria-label="مسح" className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate-400">
            <X className="size-4" />
          </button>
        )}
        {big && (
          <button type="submit" className="btn-primary absolute end-2 top-1/2 h-10 -translate-y-1/2">
            قارن الأسعار
          </button>
        )}
      </div>

      {showList && (
        <div id={listId} role="listbox" className="card absolute inset-x-0 top-full z-50 mt-2 overflow-hidden p-1.5 shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-500">لا توجد نتائج لـ “{q}”</p>
          ) : (
            <>
              {results.map((p, i) => {
                const lp = lowestPrice(p);
                return (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(`/product/${p.slug}`)}
                    className={`flex items-center gap-3 rounded-xl p-2 transition ${i === active ? "bg-brand-50 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                  >
                    <ProductImage product={p} className="size-11 shrink-0 rounded-lg" iconSize="size-5" />
                    <div className="min-w-0 flex-1">
                      <p className="ltr truncate text-start text-sm font-bold">{p.name}</p>
                      {lp && (
                        <p className="text-xs text-slate-500">
                          يبدأ من <span className="font-bold text-deal-600">{formatEGP(lp.price)}</span>
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
              <button
                type="submit"
                onMouseDown={(e) => e.preventDefault()}
                className="mt-1 w-full rounded-xl px-3 py-2 text-start text-sm font-bold text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
              >
                عرض كل النتائج لـ “{q}”
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
