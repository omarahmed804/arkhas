#!/usr/bin/env node
/**
 * أرخص — automatic price tracker.
 *
 * Runs on a schedule via GitHub Actions (.github/workflows/update-prices.yml):
 *   1. Reads data/catalog.json
 *   2. Visits each store product URL (offers with linkType "website" and autoTrack !== false)
 *   3. Reads the price from the page's structured data (schema.org JSON-LD / product meta tags —
 *      the same data stores publish for Google Shopping)
 *   4. Updates price, stock, "last updated" time and today's price-history point
 *   5. Writes the file back → the workflow commits it → Vercel redeploys automatically
 *
 * Polite by design: respects robots.txt, identifies itself, waits between requests to the
 * same store, and never tries to get around blocking or CAPTCHAs. Stores that block bots
 * (often Amazon and Noon) are reported as errors and keep their last known price.
 *
 * Usage:
 *   node scripts/update-prices.mjs            # update data/catalog.json
 *   node scripts/update-prices.mjs --dry-run  # only print what would change
 *   node scripts/update-prices.mjs --store=sigma
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "data", "catalog.json");
const USER_AGENT = "ArkhasPriceBot/1.0 (price comparison; respects robots.txt)";
const DELAY_PER_HOST_MS = 3000;
const TIMEOUT_MS = 20000;
/** Reject a new price outside this ratio of the old one — usually means the page changed product. */
const MIN_RATIO = 0.4;
const MAX_RATIO = 2.5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ───────────── Price extraction (exported for tests) ───────────── */

function toNumber(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d.,]/g, "");
  // "1,234.50" → 1234.5 ; "1.234,50" → 1234.5
  const normalized = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  return parseFloat(normalized);
}

function* walkJsonLd(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) yield* walkJsonLd(n);
    return;
  }
  yield node;
  if (node["@graph"]) yield* walkJsonLd(node["@graph"]);
  if (node.mainEntity) yield* walkJsonLd(node.mainEntity);
}

function offerFromLd(offers) {
  const list = Array.isArray(offers) ? offers : [offers];
  const candidates = [];
  for (const o of list) {
    if (!o || typeof o !== "object") continue;
    const currency = o.priceCurrency ?? o.priceSpecification?.priceCurrency;
    if (currency && String(currency).toUpperCase() !== "EGP") continue;
    const price = toNumber(o.price ?? o.lowPrice ?? o.priceSpecification?.price);
    if (!(price > 0)) continue;
    const availability = String(o.availability ?? "");
    const inStock = availability ? !/OutOfStock|SoldOut|Discontinued|PreOrder/i.test(availability) : undefined;
    candidates.push({ price, inStock });
  }
  // Several offers (e.g. variants) → take the cheapest in-stock one
  candidates.sort((a, b) => (a.inStock === false) - (b.inStock === false) || a.price - b.price);
  return candidates[0];
}

/** Returns { price, inStock? } or null. */
export function extractPrice(html) {
  // 1) JSON-LD structured data
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let data;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    for (const node of walkJsonLd(data)) {
      const type = [].concat(node["@type"] ?? []).join(",");
      if ((/Product|ProductGroup/i.test(type) || !type) && node.offers) {
        const found = offerFromLd(node.offers);
        if (found) return found;
      }
    }
  }
  // 2) Product meta tags (Shopify, WooCommerce, OpenGraph)
  const meta = (prop) => {
    const r1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i");
    const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${prop}["']`, "i");
    return (html.match(r1) ?? html.match(r2))?.[1];
  };
  const currency = meta("product:price:currency") ?? meta("og:price:currency") ?? meta("priceCurrency");
  const amount = meta("product:price:amount") ?? meta("og:price:amount") ?? meta("price");
  if (amount && (!currency || currency.toUpperCase() === "EGP")) {
    const price = toNumber(amount);
    if (price > 0) {
      const avail = meta("product:availability") ?? meta("og:availability") ?? "";
      return { price, inStock: avail ? !/out ?of ?stock|oos|sold/i.test(avail) : undefined };
    }
  }
  return null;
}

/* ───────────── robots.txt ───────────── */

const robotsCache = new Map();

export function parseRobots(txt) {
  // Returns disallow rules that apply to "*" or to our bot.
  const rules = { disallow: [], allow: [] };
  let applies = false;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      const ua = val.toLowerCase();
      const match = ua === "*" || ua.includes("arkhaspricebot");
      applies = lastWasAgent ? applies || match : match;
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!applies) continue;
    if (key === "disallow" && val) rules.disallow.push(val);
    if (key === "allow" && val) rules.allow.push(val);
  }
  return rules;
}

function ruleMatches(rule, p) {
  const re = new RegExp("^" + rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
  return re.test(p);
}

export function isAllowed(rules, urlPath) {
  const longest = (list) => list.filter((r) => ruleMatches(r, urlPath)).reduce((a, r) => Math.max(a, r.length), -1);
  const d = longest(rules.disallow);
  const a = longest(rules.allow);
  return d < 0 || a >= d;
}

async function robotsAllow(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.host)) {
    let rules = { disallow: [], allow: [] };
    try {
      const res = await fetch(`${u.protocol}//${u.host}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok) rules = parseRobots(await res.text());
    } catch {
      /* no robots.txt reachable → allowed */
    }
    robotsCache.set(u.host, rules);
  }
  return isAllowed(robotsCache.get(u.host), u.pathname + u.search);
}

/* ───────────── Main ───────────── */

async function checkOffer(offer) {
  if (!(await robotsAllow(offer.url))) return { error: "robots.txt بيمنع المتابعة الآلية" };
  let res;
  try {
    res = await fetch(offer.url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "ar-EG,ar;q=0.9,en;q=0.8", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return { error: `تعذر الوصول للصفحة (${e.name === "TimeoutError" ? "timeout" : "network"})` };
  }
  if (res.status === 404) return { error: "الصفحة مش موجودة (404) — الرابط محتاج تحديث" };
  if (res.status === 403 || res.status === 429 || res.status === 503) return { error: `المتجر بيمنع المتابعة الآلية (${res.status})` };
  if (!res.ok) return { error: `خطأ من المتجر (${res.status})` };
  const found = extractPrice(await res.text());
  if (!found) return { error: "مش لاقي السعر في الصفحة (ممكن تكون صفحة قسم مش منتج)" };
  const ratio = found.price / offer.price;
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) return { error: `سعر غريب (${Math.round(found.price)}) — اتأكد إن الرابط لنفس المنتج` };
  return { price: Math.round(found.price), inStock: found.inStock };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyStore = args.find((a) => a.startsWith("--store="))?.split("=")[1];

  const catalog = JSON.parse(await readFile(CATALOG_PATH, "utf8"));
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // Group work by host so each store gets requests one at a time with a delay.
  const jobs = new Map();
  for (const product of catalog.products) {
    for (const offer of product.offers) {
      if ((offer.linkType ?? "website") !== "website" || offer.autoTrack === false || !offer.url) continue;
      if (onlyStore && offer.storeId !== onlyStore) continue;
      const host = new URL(offer.url).host;
      if (!jobs.has(host)) jobs.set(host, []);
      jobs.get(host).push({ product, offer });
    }
  }

  const summary = { checked: 0, changed: 0, failed: 0 };
  await Promise.all(
    [...jobs.values()].map(async (list) => {
      for (const { product, offer } of list) {
        const result = await checkOffer(offer);
        summary.checked++;
        offer.lastCheckedAt = now;
        if (result.error) {
          summary.failed++;
          offer.lastCheckError = result.error;
          console.log(`✗ ${offer.storeId} · ${product.slug}: ${result.error}`);
        } else {
          delete offer.lastCheckError;
          const changed = result.price !== offer.price || (result.inStock !== undefined && result.inStock !== offer.inStock);
          if (changed) {
            summary.changed++;
            console.log(`↻ ${offer.storeId} · ${product.slug}: ${offer.price} → ${result.price}${result.inStock === false ? " (نفذ)" : ""}`);
            if (offer.oldPrice && offer.oldPrice <= result.price) delete offer.oldPrice;
            offer.price = result.price;
            if (result.inStock !== undefined) offer.inStock = result.inStock;
          } else {
            console.log(`✓ ${offer.storeId} · ${product.slug}: ${offer.price}`);
          }
          offer.updatedAt = now; // price confirmed just now
        }
        await sleep(DELAY_PER_HOST_MS);
      }
    }),
  );

  // Today's point in the price history = cheapest in-stock offer
  for (const product of catalog.products) {
    const inStock = product.offers.filter((o) => o.inStock).map((o) => o.price);
    if (!inStock.length) continue;
    const price = Math.min(...inStock);
    product.priceHistory = [...(product.priceHistory ?? []).filter((p) => p.date !== today), { date: today, price }].slice(-120);
  }
  catalog.updatedAt = now;

  console.log(`\nChecked ${summary.checked}, changed ${summary.changed}, failed ${summary.failed}.`);
  if (dryRun) return console.log("(dry run — nothing written)");
  await writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");
  console.log("Wrote data/catalog.json");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
