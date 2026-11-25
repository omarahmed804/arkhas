"use client";

/** /favorites — the products this visitor saved, with how much each price moved since saving. */
import { Heart, TrendingDown, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "./ProductCard";
import { useCatalog } from "./CatalogProvider";
import { useFavorites } from "./Favorites";
import { lowestPrice } from "@/lib/pricing";
import { formatEGP } from "@/lib/format";
import { tr } from "@/lib/i18n";

export function FavoritesView() {
  const { catalog } = useCatalog();
  const { favs, ready, remove } = useFavorites();

  const items = catalog.products
    .filter((p) => favs[p.id])
    .map((p) => {
      const now = lowestPrice(p);
      const saved = favs[p.id].price;
      const diff = now?.inStock && saved ? saved - now.price : 0; // >0 = cheaper now
      return { p, diff, at: favs[p.id].at };
    })
    .sort((a, b) => b.diff - a.diff || b.at.localeCompare(a.at));
  const drops = items.filter((x) => x.diff > 0).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-black">
        <Heart className="size-6 fill-rose-500 text-rose-500" /> {tr("المفضلة")}
        {items.length > 0 && <span className="text-base font-bold text-slate-400">({items.length})</span>}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{tr("محفوظة على الجهاز ده — من غير حساب.")}</p>

      {ready && drops > 0 && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-deal-50 px-3 py-2 text-sm font-bold text-deal-700 dark:bg-deal-500/10 dark:text-deal-500">
          <TrendingDown className="size-4" /> {tr("{n} من مفضلتك نزل سعرها 🎉", { n: drops })}
        </p>
      )}

      {ready && items.length === 0 ? (
        <div className="card mt-6 grid place-items-center gap-3 p-10 text-center">
          <Heart className="size-10 text-slate-300" />
          <p className="font-bold">{tr("لسه ما حفظتش حاجة")}</p>
          <p className="text-sm text-slate-500">{tr("دوس ♡ على أي منتج عشان ترجعله بسهولة وتشوف لو سعره نزل.")}</p>
          <Link href="/search?sort=popular" className="btn-primary mt-2">{tr("تصفح المنتجات")}</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map(({ p, diff }) => (
            <div key={p.id} className="flex flex-col gap-1.5">
              {diff !== 0 && (
                <p className={`flex items-center gap-1 text-xs font-black ${diff > 0 ? "text-deal-600 dark:text-deal-500" : "text-rose-600"}`}>
                  {diff > 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                  {diff > 0
                    ? tr("نزل {p} من ساعة ما حفظته", { p: formatEGP(diff) })
                    : tr("زاد {p} من ساعة ما حفظته", { p: formatEGP(-diff) })}
                </p>
              )}
              <ProductCard product={p} />
              <button type="button" onClick={() => remove(p.id)} className="inline-flex items-center justify-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-600">
                <X className="size-3.5" /> {tr("شيلها")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
