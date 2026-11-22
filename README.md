# أرخص (Arkhas) — Egyptian Price Comparison MVP

Next.js 16 (App Router) · Tailwind CSS 4 · Lucide · Recharts · Arabic RTL (Cairo font) · Light/Dark mode.

📘 **Beginner step-by-step guide (Arabic): see `DEPLOY_GUIDE.md`.**

## Run locally

Requires **Node.js 20+** (https://nodejs.org).

```bash
npm install
npm run dev
```

Open http://localhost:3000 — admin is at http://localhost:3000/admin

## Deploy free on Vercel (via GitHub)

1. Create an empty repo on https://github.com/new (e.g. `arkhas`).
2. In this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-user>/arkhas.git
   git push -u origin main
   ```
3. Go to https://vercel.com → sign in with GitHub → **Add New… → Project** → import the repo.
4. Leave the defaults (Framework: Next.js) → **Deploy**. You get a `*.vercel.app` URL in ~1 minute.
5. Every `git push` redeploys automatically. Add your own domain under Project → Settings → Domains.

## ⚠️ How data works in this MVP

- Seed data lives in **`data/catalog.json`** (12 products, 7 real Egyptian stores, all prices are **illustrative mock data** — verify before launch).
- `/admin` edits are saved to **LocalStorage = only your browser**. Visitors still see `catalog.json`.
- **To publish admin changes:** Admin → البيانات → **تصدير JSON** → replace `data/catalog.json` → `git push`.
- `/admin` is password-protected. Password = `ADMIN_PASSWORD` env variable, default **`arkhas2026`** (local testing only — **set your own on Vercel**).

## Automatic price tracking

`scripts/update-prices.mjs` + `.github/workflows/update-prices.yml` (every 6 h, free on GitHub Actions):
reads each store product URL, extracts the price from the page's schema.org JSON-LD / product meta tags,
updates `data/catalog.json` (price, stock, `updatedAt`, `lastCheckedAt`, today's history point) and commits → Vercel redeploys.
Respects robots.txt, identifies itself, 3 s between requests per store, never bypasses blocking. Rejects prices outside
0.4×–2.5× of the previous one (likely wrong product). Offers with `autoTrack: false` (category pages, manual stores) are skipped.
Run locally: `node scripts/update-prices.mjs --dry-run`. Amazon/Noon usually block bots → manual or affiliate APIs.

## Data

`data/catalog.json` — 69 products (incl. 33 PS5 + 18 PS4 games), 16 Egyptian stores, 108 offers, all linking to the exact
product page (no search/category links). 58 prices were read live from store pages on 22 Nov 2026; the rest are flagged
`needsCheck` ("السعر بيتأكد") until the tracker or the admin confirms them, and are never shown as the best price while a
confirmed one exists. Price history starts on that date (verdict after 7 days, no invented history).

## Affiliate links & click tracking

All store buttons go through `/go?p=&s=&u=` (`app/go/route.ts`): adds the store's `affiliateParams` (e.g. `tag=you-21`)
or wraps the URL in `affiliateTemplate` (`{url}`), logs `arkhas-click` to Vercel logs, 302-redirects. Unknown URLs are only
followed if they're on the store's own domain (no open redirect).

## PWA

`app/manifest.ts`, `public/sw.js` (network-first pages, offline fallback `/offline`), `components/PwaInstall.tsx`
(Android install prompt, iOS instructions), icons in `public/` and `app/apple-icon.png`.

## Project structure

```
app/                     routes: / , /search , /category/[slug] , /product/[slug] , /admin
components/              UI (Header, SearchBox, ListingView, ProductCard, product/*, admin/*)
lib/types.ts             data model (Industry → Category → Product → Offer)
lib/pricing.ts           best price, market discount, 30-day history verdict
lib/offer-link.ts        website / WhatsApp / social CTA buttons + WhatsApp message template
lib/repository.ts        data access layer (LocalStorage now → Supabase later)
data/catalog.json        product, store and price data (updated by the tracker)
scripts/update-prices.mjs automatic price tracker
supabase/schema.sql      ready-to-run Postgres schema
```

## Adding a new industry (Smartphones, Home Appliances, Fashion…)

No code changes: Admin → **الأقسام والمجالات** → مجال جديد → add categories (name, slug, icon).
They appear automatically in the nav, filters, homepage and at `/category/<slug>`.
Product specs are free-form label/value pairs, so any industry fits. To offer more icons, add them to `ICONS` in `components/DynamicIcon.tsx`.

## Store buttons per offer

Each store price has a `linkType`:

| type | button | opens |
|---|---|---|
| `website` | اذهب للمتجر | the product URL (`rel="nofollow sponsored"`) |
| `whatsapp` | اطلب واتساب | `wa.me/<number>?text=…` with product name + price prefilled (Egyptian `01…` numbers auto-converted to `201…`) |
| `social` | تواصل مع الصفحة | Facebook / Instagram page or post |

Edit the WhatsApp message in `lib/offer-link.ts → whatsappMessage()`.
The seed only uses website links; switch any store's price to WhatsApp or social from Admin → edit product.

## Moving to Supabase

1. Create a project at https://supabase.com → SQL Editor → run `supabase/schema.sql`.
2. `npm i @supabase/supabase-js`, add `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars.
3. Implement `SupabaseRepository` (sketch in `lib/repository.ts`) and return it from `getRepository()`.
4. Price alerts then need a scheduled job (Vercel Cron / Supabase Edge Function) that compares `price_alerts.target_price` with new prices and sends email/WhatsApp.
