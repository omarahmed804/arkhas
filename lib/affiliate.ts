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
  if (store.admitadDeeplink?.trim()) return admitadLink(store.admitadDeeplink, out);
  if (store.affiliateTemplate?.includes("{url}")) out = store.affiliateTemplate.replace("{url}", encodeURIComponent(out));
  return out;
}

/**
 * Admitad deeplink: base "https://ad.admitad.com/g/abc123/" + product url → ".../g/abc123/?ulp=<encoded url>".
 * Accepts a base that already has a query string, or one already containing "ulp=" (replaced).
 */
export function admitadLink(base: string, productUrl: string): string {
  const b = base.trim();
  try {
    const u = new URL(b);
    u.searchParams.set("ulp", productUrl);
    return u.toString();
  } catch {
    return `${b}${b.includes("?") ? "&" : "?"}ulp=${encodeURIComponent(productUrl)}`;
  }
}

/** True when clicks to this store earn you a commission. */
export function hasAffiliate(store?: { affiliateParams?: string; affiliateTemplate?: string; admitadDeeplink?: string }): boolean {
  return !!(store?.affiliateParams?.trim() || store?.affiliateTemplate?.includes("{url}") || store?.admitadDeeplink?.trim());
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
