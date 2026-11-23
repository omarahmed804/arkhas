"use client";

import { ArrowLeft, Store as StoreIcon } from "lucide-react";
import Link from "next/link";
import { ProductImage } from "./ui";
import { formatEGP, storesCountLabel } from "@/lib/format";
import { inStockStoreCount, lowestPrice, marketDiscount, type OfferFilter } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { tr } from "@/lib/i18n";

export function ProductCard({ product, filter }: { product: Product; filter?: OfferFilter }) {
  const lp = lowestPrice(product, filter);
  const discount = marketDiscount(product);
  const stores = inStockStoreCount(product);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg"
    >
      <div className="relative">
        <ProductImage product={product} className="aspect-[4/3] w-full" />
        {discount >= 3 && (
          <span className="chip absolute top-2 start-2 bg-deal-500 text-white shadow">{tr("أوفر {n}%", { n: discount })}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="text-xs font-bold text-slate-500">{product.brand}</p>
        <h3 className="ltr line-clamp-2 min-h-10 text-start text-sm font-bold leading-5 group-hover:text-brand-600">{product.name}</h3>
        <div className="mt-auto">
          {lp ? (
            <>
              <p className="text-[11px] text-slate-500">{lp.inStock ? tr("أقل سعر") : tr("آخر سعر (غير متوفر)")}</p>
              <p className={`text-lg font-black ${lp.inStock ? "text-deal-600 dark:text-deal-500" : "text-slate-400 line-through"}`}>
                {formatEGP(lp.price)}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">{tr("لا توجد عروض")}</p>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <StoreIcon className="size-3.5" /> {storesCountLabel(stores)}
          </p>
        </div>
        <span className="btn mt-1 w-full bg-brand-50 py-2 text-brand-700 group-hover:bg-brand-600 group-hover:text-white dark:bg-slate-800 dark:text-brand-100">
          {tr("قارن الأسعار")} <ArrowLeft className="size-4 ltr:rotate-180" />
        </span>
      </div>
    </Link>
  );
}
