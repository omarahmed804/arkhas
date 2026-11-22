"use client";

/** Small shared UI pieces: product image, store logo, badges, time-ago. */
import { BadgeCheck } from "lucide-react";
import { useCatalog } from "./CatalogProvider";
import { DynamicIcon } from "./DynamicIcon";
import { timeAgo } from "@/lib/format";
import type { Product, Store } from "@/lib/types";

const PALETTES = [
  "from-blue-100 to-indigo-200 text-indigo-600 dark:from-blue-950 dark:to-indigo-900 dark:text-indigo-300",
  "from-emerald-100 to-teal-200 text-teal-700 dark:from-emerald-950 dark:to-teal-900 dark:text-teal-300",
  "from-slate-100 to-slate-300 text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300",
  "from-violet-100 to-fuchsia-200 text-violet-700 dark:from-violet-950 dark:to-fuchsia-900 dark:text-violet-300",
  "from-amber-100 to-orange-200 text-orange-700 dark:from-amber-950 dark:to-orange-900 dark:text-orange-300",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Product image with an illustrated fallback (category icon + brand) when
 * the product has no image URL yet. Plain <img> keeps any store CDN working
 * without next.config image domains.
 */
export function ProductImage({
  product,
  index = 0,
  className = "",
  iconSize = "size-14",
}: {
  product: Product;
  index?: number;
  className?: string;
  iconSize?: string;
}) {
  const { categoryById } = useCatalog();
  const src = product.images[index];
  if (src) {
    return (
      <div className={`relative overflow-hidden bg-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={product.name} loading="lazy" className="absolute inset-0 size-full object-contain p-3" />
      </div>
    );
  }
  const cat = categoryById(product.categoryId);
  const palette = PALETTES[hash(product.id + index) % PALETTES.length];
  return (
    <div className={`relative grid place-items-center overflow-hidden bg-gradient-to-br ${palette} ${className}`} aria-hidden>
      <DynamicIcon name={cat?.icon ?? "Package"} className={`${iconSize} opacity-80`} strokeWidth={1.4} />
      <span className="ltr absolute bottom-2 start-3 text-[11px] font-extrabold uppercase tracking-wider opacity-60">
        {product.brand}
      </span>
    </div>
  );
}

export function StoreLogo({ store, size = "md" }: { store: Store; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-12 text-sm" : "size-10 text-xs";
  if (store.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={store.logoUrl} alt={store.nameEn} className={`${dims} shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-slate-200 dark:ring-slate-700`} />
    );
  }
  return (
    <span
      className={`${dims} ltr grid shrink-0 place-items-center rounded-xl font-black text-white shadow-sm`}
      style={{ backgroundColor: store.color }}
      aria-hidden
    >
      {store.logoText}
    </span>
  );
}

export function TrustBadge() {
  return (
    <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-100">
      <BadgeCheck className="size-3.5" /> موثوق
    </span>
  );
}

/** Relative time; suppressHydrationWarning because "now" differs between server and client. */
export function TimeAgo({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}
