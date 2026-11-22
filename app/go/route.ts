/**
 * Outbound click redirect: /go?p=<product-slug>&s=<store-id>&u=<store-url>
 *
 * 1. Finds the offer in data/catalog.json (falls back to `u` only if it's on the store's own domain —
 *    never an open redirect).
 * 2. Adds the store's affiliate tag / wraps it in the affiliate network link, so the store
 *    (Amazon, Noon, Jumia…) credits YOU for the sale — even if the shopper closes the tab and
 *    buys later within the program's cookie window.
 * 3. Logs the click (Vercel → Project → Logs, filter "arkhas-click") for your own stats.
 */
import { NextResponse, type NextRequest } from "next/server";
import { sameSite, withAffiliate } from "@/lib/affiliate";
import { SEED_CATALOG } from "@/lib/repository";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const slug = sp.get("p") ?? "";
  const storeId = sp.get("s") ?? "";
  const fallback = sp.get("u") ?? "";

  const store = SEED_CATALOG.stores.find((s) => s.id === storeId);
  const offer = SEED_CATALOG.products.find((p) => p.slug === slug)?.offers.find((o) => o.storeId === storeId);

  let target = offer?.url ?? "";
  if (!target && store && /^https?:\/\//.test(fallback) && sameSite(fallback, store.url || fallback)) target = fallback;
  if (!target) return NextResponse.redirect(new URL(slug ? `/product/${slug}` : "/", req.url));

  const finalUrl = withAffiliate(target, store);
  console.log(
    JSON.stringify({ event: "arkhas-click", product: slug, store: storeId, price: offer?.price, at: new Date().toISOString(), ref: req.headers.get("referer") ?? "" }),
  );
  const res = NextResponse.redirect(finalUrl, 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
