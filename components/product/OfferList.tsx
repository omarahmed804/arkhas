"use client";

/**
 * Store comparison list. One responsive grid row per store:
 * stacked card on mobile (no horizontal scrolling), table-like row on desktop.
 */
import { AlertTriangle, BadgeCheck, Clock, ExternalLink, RefreshCw, MessageCircle, PackageX, Truck, Users } from "lucide-react";
import { useCatalog } from "../CatalogProvider";
import { StoreLogo, TimeAgo, TrustBadge } from "../ui";
import { formatEGP } from "@/lib/format";
import { offerCta } from "@/lib/offer-link";
import { isStale, sortOffers } from "@/lib/pricing";
import type { Offer, Product } from "@/lib/types";

export function OfferCtaButton({ offer, product, className = "" }: { offer: Offer; product: Product; className?: string }) {
  const cta = offerCta(offer, product);
  const style =
    cta.type === "whatsapp"
      ? "bg-[#25D366] text-white hover:bg-[#1ebe5b]"
      : cta.type === "social"
        ? "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        : "";
  const Icon = cta.type === "whatsapp" ? MessageCircle : cta.type === "social" ? Users : ExternalLink;
  if (!cta.href) {
    return (
      <span className={`btn cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 ${className}`} title="الرابط غير مضبوط">
        {cta.label}
      </span>
    );
  }
  return (
    <a
      href={cta.href}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className={`btn ${style || "btn-primary"} ${!offer.inStock ? "opacity-60" : ""} ${className}`}
    >
      {cta.label} <Icon className="size-4" />
    </a>
  );
}

/** Price credibility: when it was last confirmed + whether the tracker watches it. */
function Freshness({ offer }: { offer: Offer }) {
  const stale = isStale(offer.updatedAt);
  const tracked = offer.lastCheckedAt && !offer.lastCheckError && !isStale(offer.lastCheckedAt);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`flex items-center gap-1 ${stale ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
        {stale ? <AlertTriangle className="size-3.5" /> : <Clock className="size-3.5" />}
        <span>
          تم التحديث <TimeAgo iso={offer.updatedAt} />
        </span>
      </span>
      {tracked && (
        <span className="flex items-center gap-1 font-bold text-brand-600" title="السعر بيتراجع تلقائيًا من صفحة المتجر">
          <RefreshCw className="size-3" /> متابَع تلقائيًا
        </span>
      )}
      {stale && <span className="font-bold text-amber-600 dark:text-amber-400">أكّد السعر في صفحة المتجر</span>}
    </span>
  );
}

export function OfferList({ product }: { product: Product }) {
  const { storeById } = useCatalog();
  const offers = sortOffers(product.offers);
  const cheapest = offers.find((o) => o.inStock);

  return (
    <div className="card overflow-hidden">
      {/* Desktop header */}
      <div className="hidden grid-cols-[1.6fr_1fr_1.3fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid dark:border-slate-800 dark:bg-slate-800/50">
        <span>المتجر</span>
        <span>السعر</span>
        <span>التوفر والشحن</span>
        <span>آخر تحديث</span>
        <span className="w-36" />
      </div>

      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {offers.map((o) => {
          const store = storeById(o.storeId);
          if (!store) return null;
          const isBest = o === cheapest;
          return (
            <li
              key={o.storeId}
              className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 p-4 md:grid-cols-[1.6fr_1fr_1.3fr_1fr_auto] md:gap-4 md:px-5 ${
                isBest ? "bg-deal-50/70 dark:bg-deal-500/5" : ""
              } ${!o.inStock ? "opacity-75" : ""}`}
            >
              {/* Store */}
              <div className="flex min-w-0 items-center gap-3">
                <StoreLogo store={store} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{store.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {store.trusted && <TrustBadge />}
                    {isBest && (
                      <span className="chip bg-deal-500 text-white">
                        <BadgeCheck className="size-3.5" /> أرخص سعر
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="text-end md:text-start">
                <p className={`text-lg font-black ${isBest ? "text-deal-600 dark:text-deal-500" : ""}`}>{formatEGP(o.price)}</p>
                {o.oldPrice && o.oldPrice > o.price && <p className="text-xs text-slate-400 line-through">{formatEGP(o.oldPrice)}</p>}
              </div>

              {/* Stock + shipping */}
              <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:col-span-1 md:block md:space-y-1">
                {o.inStock ? (
                  <p className="flex items-center gap-1 font-bold text-deal-600 dark:text-deal-500">
                    <span className="size-2 rounded-full bg-deal-500" /> متوفر
                  </p>
                ) : (
                  <p className="flex items-center gap-1 font-bold text-red-600">
                    <PackageX className="size-3.5" /> نفذت الكمية
                  </p>
                )}
                <p className="flex items-center gap-1 text-slate-500">
                  <Truck className="size-3.5" />
                  {o.freeShipping ? <span className="font-bold text-brand-600">شحن مجاني</span> : "شحن مدفوع"} · {o.deliveryEta}
                </p>
                {/* Last updated (mobile inline) */}
                <div className="md:hidden">
                  <Freshness offer={o} />
                </div>
              </div>

              {/* Last updated (desktop column) */}
              <div className="hidden text-xs md:block">
                <Freshness offer={o} />
              </div>

              {/* CTA */}
              <OfferCtaButton offer={o} product={product} className="col-span-2 w-full md:col-span-1 md:w-36" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
