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

## Project structure

```
app/                     routes: / , /search , /category/[slug] , /product/[slug] , /admin
components/              UI (Header, SearchBox, ListingView, ProductCard, product/*, admin/*)
lib/types.ts             data model (Industry → Category → Product → Offer)
lib/pricing.ts           best price, market discount, 30-day history verdict
lib/offer-link.ts        website / WhatsApp / social CTA buttons + WhatsApp message template
lib/repository.ts        data access layer (LocalStorage now → Supabase later)
data/catalog.json        seed data
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
