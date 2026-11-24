/**
 * Sends "price dropped" emails. Runs in GitHub Actions right after update-prices.mjs.
 *
 *  1. Reads data/catalog.json (fresh prices).
 *  2. Reads waiting alerts from Supabase (price_alerts_live where notified_at is null).
 *  3. If the cheapest in-stock price ≤ the visitor's target → sends one email and marks it notified.
 *
 * Secrets (GitHub → Settings → Secrets and variables → Actions):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, BREVO_API_KEY, SENDER_EMAIL (arkhas.eg@gmail.com)
 *   (or GMAIL_USER + GMAIL_APP_PASSWORD instead of Brevo)
 * Missing secrets → the script just explains and exits without failing the workflow.
 */
import { readFile } from "node:fs/promises";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, BREVO_API_KEY } = process.env;
const SENDER_EMAIL = process.env.SENDER_EMAIL || GMAIL_USER || "arkhas.eg@gmail.com";
const SITE = (process.env.SITE_URL || "https://arkhas-seven.vercel.app").replace(/\/$/, "");
const TABLE = "price_alerts_live";
const DRY = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.log("Alerts: SUPABASE_URL / SUPABASE_SERVICE_KEY not set — skipping.");
  process.exit(0);
}
if (!DRY && !BREVO_API_KEY && (!GMAIL_USER || !GMAIL_APP_PASSWORD)) {
  console.log("Alerts: no email sender set (BREVO_API_KEY, or GMAIL_USER + GMAIL_APP_PASSWORD) — skipping.");
  process.exit(0);
}

const api = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${TABLE}`;
// New "secret" keys (sb_secret_…) → apikey header only; legacy JWT service_role keys also need Bearer.
const H = {
  apikey: SUPABASE_SERVICE_KEY,
  ...(SUPABASE_SERVICE_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } : {}),
  "Content-Type": "application/json",
};

/** Cheapest confirmed, in-stock price from an active store — same rule the site uses. */
export function bestOffer(product, stores) {
  const active = new Set(stores.filter((s) => s.active !== false).map((s) => s.id));
  return product.offers
    .filter((o) => o.inStock && !o.needsCheck && active.has(o.storeId) && o.price > 0)
    .sort((a, b) => a.price - b.price)[0];
}

const fmt = (n) => new Intl.NumberFormat("en-US").format(Math.round(n));

export function buildEmail(alert, product, offer, store) {
  const en = alert.lang === "en";
  const url = `${SITE}/product/${product.slug}`;
  const off = `${SITE}/api/alerts/unsubscribe?id=${alert.id}`;
  const price = en ? `EGP ${fmt(offer.price)}` : `${fmt(offer.price)} ج.م`;
  const storeName = en ? store?.nameEn || store?.name : store?.name || store?.nameEn;
  const subject = en ? `Price drop: ${product.name} is now ${price}` : `السعر نزل: ${product.nameAr || product.name} بقى ${price}`;
  const lines = en
    ? [`Good news! ${product.name} dropped to ${price} at ${storeName}.`, `Your target was EGP ${fmt(alert.target_price)}.`, "Compare all stores", "Stop this alert"]
    : [`خبر حلو! ${product.nameAr || product.name} نزل لـ ${price} في ${storeName}.`, `السعر اللي كنت مستنيه: ${fmt(alert.target_price)} ج.م`, "قارن كل المتاجر", "إلغاء التنبيه"];
  const html = `<div dir="${en ? "ltr" : "rtl"}" style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:20px;color:#0f172a">
<h2 style="margin:0 0 12px">📉 ${lines[0]}</h2><p style="color:#475569">${lines[1]}</p>
<p><a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:bold">${lines[2]}</a></p>
<p style="font-size:12px;color:#94a3b8;margin-top:28px">${en ? "Prices change fast — check the store page for the final price." : "الأسعار بتتغير بسرعة، والسعر النهائي هو اللي في صفحة المتجر."}<br><a href="${off}" style="color:#94a3b8">${lines[3]}</a></p></div>`;
  return { subject, html, text: `${lines[0]}\n${lines[1]}\n${url}\n\n${lines[3]}: ${off}` };
}

async function main() {
  const catalog = JSON.parse(await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"));
  const res = await fetch(`${api}?notified_at=is.null&select=*`, { headers: H });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  const alerts = await res.json();
  console.log(`Alerts: ${alerts.length} waiting.`);
  if (!alerts.length) return;

  /** Brevo HTTP API (free: 300 emails/day) — or Gmail SMTP as a fallback. */
  let send;
  if (!DRY && BREVO_API_KEY) {
    send = async (to, mail) => {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ sender: { name: "أرخص Arkhas", email: SENDER_EMAIL }, to: [{ email: to }], subject: mail.subject, htmlContent: mail.html, textContent: mail.text }),
      });
      if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
    };
  } else if (!DRY) {
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s/g, "") } });
    send = (to, mail) => transport.sendMail({ from: `"أرخص Arkhas" <${GMAIL_USER}>`, to, ...mail });
  }

  let sent = 0;
  for (const a of alerts) {
    const product = catalog.products.find((p) => p.id === a.product_id);
    if (!product) continue;
    const offer = bestOffer(product, catalog.stores);
    if (!offer || offer.price > Number(a.target_price)) continue;
    const store = catalog.stores.find((s) => s.id === offer.storeId);
    const mail = buildEmail(a, product, offer, store);
    if (DRY) {
      console.log(`[dry] → ${a.email}: ${mail.subject}`);
      continue;
    }
    try {
      await send(a.email, mail);
      await fetch(`${api}?id=eq.${a.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ notified_at: new Date().toISOString() }) });
      sent++;
      console.log(`Sent → ${a.email.replace(/(.).+@/, "$1***@")}: ${product.name} @ ${offer.price}`);
    } catch (e) {
      console.error(`Failed for alert ${a.id}:`, e.message);
    }
  }
  console.log(`Alerts: ${sent} email(s) sent.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(0); // never block the price update because of an email problem
  });
}
