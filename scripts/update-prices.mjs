#!/usr/bin/env node
/**
 * أرخص — automatic price tracker (runs every 6 hours on GitHub Actions).
 *
 *   1. Reads data/catalog.json
 *   2. Checks every offer link:
 *        • Shopify stores (Shamy, Dream 2000)  → exact price from /products/<handle>.js
 *        • Amazon.eg                            → Product Advertising API (needs your Associates keys)
 *        • Other stores                         → schema.org JSON-LD / product meta tags on the page
 *   3. Auto-discovery: looks for each PS5/PS4 game and PSN card in the full catalog of the
 *      Shopify stores (and Amazon search when keys are set) and adds the offer if the name matches
 *      strictly (same title, same platform, never used/digital listings).
 *   4. Updates price, old price, stock, image, "last updated" and today's history point
 *   5. Writes the file → the workflow commits it → Vercel redeploys automatically
 *
 * Polite by design: respects robots.txt, identifies itself, waits between requests to the same
 * store, and never tries to get around blocking or CAPTCHAs.
 *
 * Usage:
 *   node scripts/update-prices.mjs                 # check + discover, write data/catalog.json
 *   node scripts/update-prices.mjs --dry-run       # only print what would change
 *   node scripts/update-prices.mjs --no-discover   # only check existing offers
 *   node scripts/update-prices.mjs --store=shamy
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createHash, createHmac } from "node:crypto";

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

/** Product image published by the store (JSON-LD image or og:image). */
export function extractImage(html, baseUrl) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      for (const node of walkJsonLd(JSON.parse(m[1].trim()))) {
        if (!/Product/i.test([].concat(node["@type"] ?? []).join(","))) continue;
        let img = node.image;
        if (Array.isArray(img)) img = img[0];
        if (img && typeof img === "object") img = img.url ?? img.contentUrl;
        if (typeof img === "string" && img) return new URL(img, baseUrl).toString();
      }
    } catch {}
  }
  const og = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i) ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return og ? new URL(og[1].replace(/&amp;/g, "&"), baseUrl).toString() : null;
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

/* ───────────── Shopify stores (Shamy, Dream 2000…) ───────────── */

/** "https://shop.com/products/handle?x=1" → "https://shop.com/products/handle" (or null). */
export function shopifyProductBase(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^(.*\/products\/[^/]+?)(?:\.js|\.json)?\/?$/);
    return m ? `${u.origin}${m[1]}` : null;
  } catch {
    return null;
  }
}

/** Reads a Shopify product from its public `/products/<handle>.js` data (price in minor units). */
export function parseShopifyJs(data, variantId) {
  if (!data || !Array.isArray(data.variants) || !data.variants.length) return null;
  const v = (variantId && data.variants.find((x) => String(x.id) === String(variantId))) || data.variants[0];
  const price = Number(v.price) / 100;
  if (!(price > 0)) return null;
  const compare = Number(v.compare_at_price) / 100;
  let image = data.featured_image || data.images?.[0] || null;
  if (image && image.startsWith("//")) image = "https:" + image;
  return {
    price: Math.round(price),
    oldPrice: compare > price ? Math.round(compare) : undefined,
    inStock: v.available !== false,
    image,
    title: data.title,
  };
}

async function fetchJson(url, extraHeaders = {}) {
  if (!(await robotsAllow(url))) return { error: "robots.txt بيمنع المتابعة الآلية" };
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...extraHeaders }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    return { error: `تعذر الوصول (${e.name === "TimeoutError" ? "timeout" : "network"})` };
  }
  if (res.status === 404) return { error: "الصفحة مش موجودة (404) — الرابط محتاج تحديث" };
  if (!res.ok) return { error: `خطأ من المتجر (${res.status})` };
  try {
    return { data: await res.json() };
  } catch {
    return { error: "رد غير مفهوم من المتجر" };
  }
}

async function checkShopifyOffer(offer) {
  const base = shopifyProductBase(offer.url);
  if (!base) return null; // not a product link → fall back to the HTML check
  const { data, error } = await fetchJson(base + ".js");
  if (error) return { error };
  const found = parseShopifyJs(data, offer.variantId);
  if (!found) return { error: "مش لاقي السعر في بيانات المتجر" };
  return found;
}

/** Whole public catalog of a Shopify store (used to auto-discover offers). */
async function loadShopifyCatalog(storeUrl) {
  const all = [];
  const origin = new URL(storeUrl).origin;
  for (let page = 1; page <= 40; page++) {
    const { data, error } = await fetchJson(`${origin}/products.json?limit=250&page=${page}`);
    if (error || !Array.isArray(data?.products) || !data.products.length) break;
    for (const p of data.products) {
      const variants = (p.variants ?? []).map((v) => ({ price: Number(v.price), compare: Number(v.compare_at_price), available: v.available !== false }));
      const v = variants.find((x) => x.available) ?? variants[0];
      if (!v || !(v.price > 0)) continue;
      all.push({
        title: p.title,
        url: `${origin}/products/${p.handle}`,
        price: Math.round(v.price),
        oldPrice: v.compare > v.price ? Math.round(v.compare) : undefined,
        inStock: !!v.available,
        image: p.images?.[0]?.src ?? null,
      });
    }
    await sleep(1500);
  }
  return all;
}

/* ───────────── Matching store titles to catalog products ───────────── */

const STOP = new Set(
  "the of a an and for with new edition standard game games video cd disc disk version region playstation sony official original cross gen launch day one physical copy arabic english ar en eng arb لعبة لعبه سي دي اسطوانة اسطوانه أسطوانة العاب ألعاب لجهاز جهاز نسخة نسخه عربي انجليزي إنجليزي بالعربي على قرص للبلاي ستيشن بلاي بلايستيشن gift card cards network wallet top up بطاقة كارت".split(" "),
);
/** Words that mean "not the same thing as a new physical copy". */
const BAD = ["used", "pre owned", "preowned", "مستعمل", "digital", "ديجيتال", "code", "كود", "primary", "secondary", "account", "حساب", "rental", "cover", "skin", "sticker", "faceplate", "case", "جراب", "ستاند", "stand", "dlc", "season pass", "steelbook", "collector", "lenticular"];

export function normalizeTitle(s) {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/play\s*station\s*5|playstation®?\s*5|بلاي?\s*ستيشن\s*5|بلايستيشن\s*5|بلاى\s*ستيشن\s*5|\bps\s*5\b/g, " ps5 ")
    .replace(/play\s*station\s*4|playstation®?\s*4|بلاي?\s*ستيشن\s*4|بلايستيشن\s*4|بلاى\s*ستيشن\s*4|\bps\s*4\b/g, " ps4 ")
    .replace(/[™®©’'`"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s) {
  return normalizeTitle(s)
    .split(" ")
    .filter((t) => t && !STOP.has(t) && t !== "ps5" && t !== "ps4");
}

/**
 * How well a store listing title matches a catalog product (0 = no match, 1 = identical).
 * Strict on purpose: every word of the product must appear, the platform must match,
 * and used/digital/accessory listings are rejected — a wrong match is worse than none.
 */
export function matchScore(productName, platform, candidateTitle) {
  const cand = normalizeTitle(candidateTitle);
  const prod = normalizeTitle(productName);
  if (platform) {
    if (!cand.includes(platform)) return 0;
    const other = platform === "ps5" ? "ps4" : "ps5";
    if (cand.includes(other) && !prod.includes(other)) return 0;
  }
  for (const bad of BAD) {
    const re = new RegExp(`(^| )${bad}( |$)`);
    if (re.test(cand) && !re.test(prod)) return 0;
  }
  const P = tokens(productName);
  const C = new Set(tokens(candidateTitle));
  if (!P.length) return 0;
  if (!P.every((t) => C.has(t))) return 0;
  const extra = [...C].filter((t) => !P.includes(t));
  // Extra numbers usually mean another game in the series (FC 26 vs FC 26 + "2"), reject.
  if (extra.some((t) => /^\d+$/.test(t))) return 0;
  return P.length / (P.length + extra.length);
}

const MIN_SCORE = 0.6;
/** Categories where automatic discovery is safe (clear names). */
const DISCOVER_CATEGORIES = { "cat-ps5-games": "ps5", "cat-ps4-games": "ps4", "cat-psn-cards": null };

export function bestMatch(product, platform, listings) {
  let best = null;
  for (const l of listings) {
    const score = matchScore(product.name, platform, l.title);
    if (score < MIN_SCORE) continue;
    if (!best || score > best.score || (score === best.score && l.inStock && (!best.inStock || l.price < best.price))) best = { ...l, score };
  }
  return best;
}

/* ───────────── Amazon (Product Advertising API 5.0) ───────────── */

const AMAZON = {
  host: "webservices.amazon.eg",
  region: "eu-west-1",
  marketplace: "www.amazon.eg",
  accessKey: process.env.AMAZON_PAAPI_ACCESS_KEY,
  secretKey: process.env.AMAZON_PAAPI_SECRET_KEY,
  partnerTag: process.env.AMAZON_PARTNER_TAG,
};
const amazonEnabled = () => !!(AMAZON.accessKey && AMAZON.secretKey && AMAZON.partnerTag);

export function asinFromUrl(url) {
  const m = String(url).match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return m ? m[1].toUpperCase() : null;
}

function sign(key, msg) {
  return createHmac("sha256", key).update(msg).digest();
}

async function paapi(operation, payload) {
  const path = `/paapi5/${operation.toLowerCase()}`;
  const body = JSON.stringify({ PartnerTag: AMAZON.partnerTag, PartnerType: "Associates", Marketplace: AMAZON.marketplace, ...payload });
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const target = `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`;
  const headers = { "content-encoding": "amz-1.0", "content-type": "application/json; charset=utf-8", host: AMAZON.host, "x-amz-date": amzDate, "x-amz-target": target };
  const signed = Object.keys(headers).sort();
  const canonical = ["POST", path, "", ...signed.map((h) => `${h}:${headers[h]}`), "", signed.join(";"), createHash("sha256").update(body).digest("hex")].join("\n");
  const scope = `${date}/${AMAZON.region}/ProductAdvertisingAPI/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, createHash("sha256").update(canonical).digest("hex")].join("\n");
  const kSigning = sign(sign(sign(sign("AWS4" + AMAZON.secretKey, date), AMAZON.region), "ProductAdvertisingAPI"), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(toSign).digest("hex");
  const res = await fetch(`https://${AMAZON.host}${path}`, {
    method: "POST",
    headers: { ...headers, Authorization: `AWS4-HMAC-SHA256 Credential=${AMAZON.accessKey}/${scope}, SignedHeaders=${signed.join(";")}, Signature=${signature}` },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.Errors?.[0]?.Message ?? `Amazon API ${res.status}`);
  return json;
}

const RES_V2 = ["ItemInfo.Title", "Images.Primary.Large", "OffersV2.Listings.Price", "OffersV2.Listings.Availability"];
const RES_V1 = ["ItemInfo.Title", "Images.Primary.Large", "Offers.Listings.Price", "Offers.Listings.SavingBasis", "Offers.Listings.Availability.Type"];

/** Normalizes an Amazon item (works with both OffersV2 and the older Offers resources). */
export function parseAmazonItem(item) {
  const listing = item?.OffersV2?.Listings?.[0] ?? item?.Offers?.Listings?.[0];
  const amount = listing?.Price?.Money?.Amount ?? listing?.Price?.Amount;
  const basis = listing?.Price?.SavingBasis?.Money?.Amount ?? listing?.SavingBasis?.Amount;
  const avail = String(listing?.Availability?.Type ?? "");
  return {
    asin: item?.ASIN,
    title: item?.ItemInfo?.Title?.DisplayValue ?? "",
    url: item?.DetailPageURL,
    image: item?.Images?.Primary?.Large?.URL ?? null,
    price: amount > 0 ? Math.round(amount) : null,
    oldPrice: basis > amount ? Math.round(basis) : undefined,
    inStock: amount > 0 && !/OutOfStock|Unavailable/i.test(avail),
  };
}

async function paapiWithFallback(operation, payload) {
  try {
    return await paapi(operation, { ...payload, Resources: RES_V2 });
  } catch (e) {
    if (!/resource/i.test(String(e.message))) throw e;
    return paapi(operation, { ...payload, Resources: RES_V1 });
  }
}

async function amazonGetItems(asins) {
  const out = new Map();
  for (let i = 0; i < asins.length; i += 10) {
    const json = await paapiWithFallback("GetItems", { ItemIds: asins.slice(i, i + 10) });
    for (const item of json?.ItemsResult?.Items ?? []) out.set(item.ASIN, parseAmazonItem(item));
    await sleep(1100); // PA-API allows ~1 request/second
  }
  return out;
}

async function amazonSearch(keywords) {
  const json = await paapiWithFallback("SearchItems", { Keywords: keywords, SearchIndex: "VideoGames", ItemCount: 10 });
  await sleep(1100);
  return (json?.SearchResult?.Items ?? []).map(parseAmazonItem).filter((x) => x.price);
}

/* ───────────── Main ───────────── */

async function checkHtmlOffer(offer) {
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
  const html = await res.text();
  const image = extractImage(html, offer.url);
  const found = extractPrice(html);
  if (!found) return { error: "مش لاقي السعر في الصفحة (ممكن تكون صفحة قسم مش منتج)", image };
  return { price: Math.round(found.price), inStock: found.inStock, image };
}

function sane(offer, result) {
  if (result.error || !offer.price) return result;
  const ratio = result.price / offer.price;
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) return { error: `سعر غريب (${result.price}) — اتأكد إن الرابط لنفس المنتج` };
  return result;
}

function applyResult(product, offer, result, now, summary) {
  offer.lastCheckedAt = now;
  if (result.image && !(product.images ?? []).length) {
    product.images = [result.image];
    console.log(`🖼  ${product.slug}: صورة من ${offer.storeId}`);
  }
  if (result.error) {
    summary.failed++;
    offer.lastCheckError = result.error;
    console.log(`✗ ${offer.storeId} · ${product.slug}: ${result.error}`);
    return;
  }
  delete offer.lastCheckError;
  delete offer.needsCheck;
  const changed = result.price !== offer.price || (result.inStock !== undefined && result.inStock !== offer.inStock);
  if (changed) {
    summary.changed++;
    console.log(`↻ ${offer.storeId} · ${product.slug}: ${offer.price} → ${result.price}${result.inStock === false ? " (نفذ)" : ""}`);
    offer.price = result.price;
    if (result.inStock !== undefined) offer.inStock = result.inStock;
  } else {
    console.log(`✓ ${offer.storeId} · ${product.slug}: ${offer.price}`);
  }
  if (result.oldPrice && result.oldPrice > offer.price) offer.oldPrice = result.oldPrice;
  else if (offer.oldPrice && offer.oldPrice <= offer.price) delete offer.oldPrice;
  offer.updatedAt = now;
}

function newOffer(storeId, l, now) {
  return {
    storeId,
    price: l.price,
    ...(l.oldPrice ? { oldPrice: l.oldPrice } : {}),
    linkType: "website",
    url: l.url,
    inStock: l.inStock,
    freeShipping: false,
    deliveryEta: "حسب المتجر",
    updatedAt: now,
    lastCheckedAt: now,
    autoDiscovered: true,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const discover = !args.includes("--no-discover");
  const onlyStore = args.find((a) => a.startsWith("--store="))?.split("=")[1];

  const catalog = JSON.parse(await readFile(CATALOG_PATH, "utf8"));
  const storeById = new Map(catalog.stores.map((s) => [s.id, s]));
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const summary = { checked: 0, changed: 0, failed: 0, discovered: 0 };

  // 1) Check every tracked offer. Work is grouped by host so each store gets one request at a time.
  const jobs = new Map();
  const amazonOffers = [];
  for (const product of catalog.products) {
    for (const offer of product.offers) {
      if ((offer.linkType ?? "website") !== "website" || offer.autoTrack === false || !offer.url) continue;
      if (onlyStore && offer.storeId !== onlyStore) continue;
      if (storeById.get(offer.storeId)?.platform === "amazon" && asinFromUrl(offer.url)) {
        amazonOffers.push({ product, offer });
        continue;
      }
      const host = new URL(offer.url).host;
      if (!jobs.has(host)) jobs.set(host, []);
      jobs.get(host).push({ product, offer });
    }
  }

  await Promise.all(
    [...jobs.values()].map(async (list) => {
      for (const { product, offer } of list) {
        const platform = storeById.get(offer.storeId)?.platform;
        let result = platform === "shopify" ? await checkShopifyOffer(offer) : null;
        if (!result) result = await checkHtmlOffer(offer);
        summary.checked++;
        applyResult(product, offer, sane(offer, result), now, summary);
        await sleep(DELAY_PER_HOST_MS);
      }
    }),
  );

  if (amazonOffers.length) {
    if (!amazonEnabled()) {
      console.log(`ℹ️  أمازون: ${amazonOffers.length} سعر محتاجين مفاتيح Amazon API (AMAZON_PAAPI_ACCESS_KEY / AMAZON_PAAPI_SECRET_KEY / AMAZON_PARTNER_TAG).`);
      for (const { offer } of amazonOffers) offer.lastCheckError = "مفاتيح Amazon API مش متضافة في GitHub Secrets";
    } else {
      try {
        const items = await amazonGetItems([...new Set(amazonOffers.map(({ offer }) => asinFromUrl(offer.url)))]);
        for (const { product, offer } of amazonOffers) {
          const item = items.get(asinFromUrl(offer.url));
          summary.checked++;
          const result = !item ? { error: "أمازون مرجعش المنتج ده" } : !item.price ? { error: "المنتج مش متاح دلوقتي على أمازون" } : item;
          if (item && !item.price) offer.inStock = false;
          applyResult(product, offer, sane(offer, result), now, summary);
        }
      } catch (e) {
        console.log(`✗ Amazon API: ${e.message}`);
      }
    }
  }

  // 2) Auto-discovery: find the same game/card in other stores and add it as a new offer.
  if (discover) {
    const targets = catalog.products.filter((p) => p.categoryId in DISCOVER_CATEGORIES);
    for (const store of catalog.stores) {
      if (store.platform !== "shopify" || (onlyStore && store.id !== onlyStore)) continue;
      const listings = await loadShopifyCatalog(store.url);
      console.log(`🔎 ${store.nameEn}: ${listings.length} منتج في المتجر`);
      for (const product of targets) {
        if (product.offers.some((o) => o.storeId === store.id)) continue;
        const m = bestMatch(product, DISCOVER_CATEGORIES[product.categoryId], listings);
        if (!m) continue;
        product.offers.push(newOffer(store.id, m, now));
        if (m.image && !(product.images ?? []).length) product.images = [m.image];
        summary.discovered++;
        console.log(`＋ ${store.id} · ${product.slug}: ${m.price} (${m.title})`);
      }
    }
    const amazon = catalog.stores.find((s) => s.platform === "amazon");
    if (amazon && amazonEnabled() && (!onlyStore || onlyStore === amazon.id)) {
      for (const product of targets) {
        const platform = DISCOVER_CATEGORIES[product.categoryId];
        if (!platform || product.offers.some((o) => o.storeId === amazon.id)) continue;
        try {
          const found = bestMatch(product, platform, await amazonSearch(`${product.name.replace(/[–—-]\s*PS[45]$/i, "")} ${platform.toUpperCase()}`));
          if (!found) continue;
          product.offers.push(newOffer(amazon.id, { ...found, url: `https://www.amazon.eg/dp/${found.asin}` }, now));
          if (found.image && !(product.images ?? []).length) product.images = [found.image];
          summary.discovered++;
          console.log(`＋ amazon · ${product.slug}: ${found.price} (${found.title})`);
        } catch (e) {
          console.log(`✗ Amazon search (${product.slug}): ${e.message}`);
          break;
        }
      }
    }
  }

  // 3) Today's point in the price history = cheapest confirmed in-stock offer
  for (const product of catalog.products) {
    const prices = product.offers.filter((o) => o.inStock && !o.needsCheck).map((o) => o.price);
    if (!prices.length) continue;
    const price = Math.min(...prices);
    product.priceHistory = [...(product.priceHistory ?? []).filter((p) => p.date !== today), { date: today, price }].slice(-120);
  }
  catalog.updatedAt = now;

  console.log(`\nChecked ${summary.checked}, changed ${summary.changed}, failed ${summary.failed}, new offers ${summary.discovered}.`);
  if (dryRun) return console.log("(dry run — nothing written)");
  await writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");
  console.log("Wrote data/catalog.json");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
