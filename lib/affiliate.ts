/** Builds the outbound store URL with the store's affiliate settings. */
import type { Store } from "./types";

export function withAffiliate(url: string, store?: Store): string {
  if (!store) return url;
  let out = url;
  if (store.affiliateParams?.trim()) {
    try {
      const u = new URL(out);
      new URLSearchParams(store.affiliateParams.trim().replace(/^\?/, "")).forEach((v, k) => u.searchParams.set(k, v));
      out = u.toString();
    } catch {
      /* keep original */
    }
  }
  if (store.affiliateTemplate?.includes("{url}")) out = store.affiliateTemplate.replace("{url}", encodeURIComponent(out));
  return out;
}

/** Same registrable host (www.amazon.eg ≈ amazon.eg) — used to refuse open redirects. */
export function sameSite(a: string, b: string): boolean {
  try {
    const h = (x: string) => new URL(x).hostname.replace(/^www\./, "");
    return h(a) === h(b) || h(a).endsWith("." + h(b)) || h(b).endsWith("." + h(a));
  } catch {
    return false;
  }
}

/** Link the "اذهب للمتجر" button points to: our /go redirect (adds affiliate tag + logs the click). */
export function goHref(productSlug: string, storeId: string, url: string): string {
  return `/go?p=${encodeURIComponent(productSlug)}&s=${encodeURIComponent(storeId)}&u=${encodeURIComponent(url)}`;
}
