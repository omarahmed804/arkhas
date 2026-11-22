/**
 * Pure pricing logic shared by every page. No React, no storage —
 * safe to reuse on the server, in API routes, or in a scraper job later.
 */
import type { Offer, Product } from "./types";

export interface OfferFilter {
  storeIds?: string[]; // limit to these stores
  inStockOnly?: boolean;
}

/** Offers sorted for display: in-stock by price ascending, then out-of-stock by price. */
export function sortOffers(offers: Offer[]): Offer[] {
  return [...offers].sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
    return a.price - b.price;
  });
}

export function availableOffers(product: Product, filter: OfferFilter = {}): Offer[] {
  return product.offers.filter((o) => {
    if (filter.storeIds?.length && !filter.storeIds.includes(o.storeId)) return false;
    if (filter.inStockOnly && !o.inStock) return false;
    return true;
  });
}

/** Cheapest in-stock offer (optionally restricted to some stores). */
export function bestOffer(product: Product, filter: OfferFilter = {}): Offer | undefined {
  const inStock = availableOffers(product, { ...filter, inStockOnly: true });
  // Never crown an unconfirmed price as "best" when a confirmed one exists.
  const confirmed = inStock.filter((o) => !o.needsCheck);
  return sortOffers(confirmed.length ? confirmed : inStock)[0];
}

/** Lowest price to display on cards. Falls back to the cheapest out-of-stock price. */
export function lowestPrice(product: Product, filter: OfferFilter = {}): { price: number; inStock: boolean } | undefined {
  const best = bestOffer(product, filter);
  if (best) return { price: best.price, inStock: true };
  const any = sortOffers(availableOffers(product, filter))[0];
  return any ? { price: any.price, inStock: false } : undefined;
}

export function inStockStoreCount(product: Product): number {
  return product.offers.filter((o) => o.inStock).length;
}

/**
 * "Discount vs market": how much cheaper the best in-stock price is than the
 * average of all current store prices. This is what "Today's Best Deals" ranks by.
 */
export function marketDiscount(product: Product): number {
  const best = bestOffer(product);
  if (!best || product.offers.length < 2) return 0;
  const avg = product.offers.reduce((s, o) => s + o.price, 0) / product.offers.length;
  return Math.max(0, Math.round(((avg - best.price) / avg) * 100));
}

export interface HistoryStats {
  min: number;
  max: number;
  avg: number;
  current: number;
  /** % the current price is below (+) or above (−) the 30-day average. */
  vsAvg: number;
  verdict: "great" | "good" | "normal" | "high";
}

/** Fake-discount detector: compares today's price with the 30-day history. */
/** Minimum days of real history before we judge a deal as real or fake. */
export const MIN_HISTORY_POINTS = 7;

/** Price older than this many days gets a "needs confirmation" hint. */
export const STALE_AFTER_DAYS = 3;

export function isStale(iso: string, now = Date.now()): boolean {
  return now - new Date(iso).getTime() > STALE_AFTER_DAYS * 86400e3;
}

export function historyStats(product: Product): HistoryStats | undefined {
  const h = product.priceHistory;
  if (h.length < MIN_HISTORY_POINTS) return undefined;
  const prices = h.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const current = bestOffer(product)?.price ?? prices[prices.length - 1];
  const vsAvg = Math.round(((avg - current) / avg) * 1000) / 10;
  let verdict: HistoryStats["verdict"] = "normal";
  if (current <= min && vsAvg >= 3) verdict = "great";
  else if (vsAvg >= 3) verdict = "good";
  else if (vsAvg <= -3) verdict = "high";
  return { min, max, avg, current, vsAvg, verdict };
}

/** Did the price drop vs. 7 days ago? Used for the navbar "Price Drops" badge. */
export function isPriceDrop(product: Product): boolean {
  const h = product.priceHistory;
  const best = bestOffer(product);
  if (!best || h.length < 8) return false;
  return best.price < h[h.length - 8].price * 0.97;
}

/** Append/replace today's point in the price history after a price edit. */
export function withTodayHistory(product: Product): Product {
  const best = bestOffer(product);
  if (!best) return product;
  const today = new Date().toISOString().slice(0, 10);
  const history = product.priceHistory.filter((p) => p.date !== today);
  history.push({ date: today, price: best.price });
  return { ...product, priceHistory: history.slice(-90) };
}
