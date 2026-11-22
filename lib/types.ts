/**
 * Domain types.
 *
 * Every type here maps 1:1 to a database table (see supabase/schema.sql),
 * so moving from the LocalStorage MVP to Supabase/Firebase is a data-layer
 * swap, not a rewrite. Nothing in the model is gaming-specific: industries
 * and categories are data, and product specs are free-form label/value pairs,
 * so Smartphones, Home Appliances or Fashion fit the same shape.
 */

/** Top-level vertical, e.g. "Gaming", "Smartphones", "Home Appliances". */
export interface Industry {
  id: string;
  name: string; // Arabic display name
  nameEn: string;
  slug: string;
  icon: IconName;
  sortOrder: number;
}

export interface Category {
  id: string;
  industryId: string;
  name: string; // Arabic display name
  nameEn: string;
  slug: string; // used in /category/[slug]
  icon: IconName;
  sortOrder: number;
}

export interface Store {
  id: string;
  name: string; // Arabic display name
  nameEn: string;
  url: string; // store homepage
  logoUrl?: string; // optional image; falls back to logoText + color
  logoText: string; // 1–3 chars shown in the colored badge
  color: string; // brand color for the badge (hex)
  trusted: boolean; // shows the "موثوق" badge
  featured: boolean; // shown in the homepage stores strip
}

/**
 * How the shopper reaches the store for this offer. Many Egyptian shops sell
 * only via WhatsApp or a Facebook/Instagram page, so the CTA adapts:
 *  - website  → "اذهب للمتجر"       opens `url`
 *  - whatsapp → "اطلب واتساب"       opens wa.me/<whatsappNumber> with a prefilled message
 *  - social   → "تواصل مع الصفحة"   opens `url` (Facebook / Instagram page or post)
 */
export type OfferLinkType = "website" | "whatsapp" | "social";

export interface Offer {
  storeId: string;
  price: number; // EGP
  oldPrice?: number; // EGP, the store's "before" price, if any
  linkType: OfferLinkType;
  url: string; // website/social: outbound (affiliate) link; whatsapp: optional, unused
  whatsappNumber?: string; // whatsapp only, e.g. "01012345678" or "201012345678"
  inStock: boolean;
  freeShipping: boolean;
  deliveryEta: string; // e.g. "خلال 24 ساعة"
  updatedAt: string; // ISO timestamp of the last price check
}

/** One point per day: the lowest in-stock price across all stores. */
export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
}

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string; // used in /product/[slug]
  name: string; // English technical name (kept LTR)
  nameAr?: string; // optional Arabic name / description line
  brand: string;
  categoryId: string;
  images: string[]; // absolute URLs; empty → illustrated placeholder
  specs: Spec[]; // first 4 are shown as "key specs"
  description?: string;
  popularity: number; // 0–100, used by "Most Popular" sort
  offers: Offer[];
  priceHistory: PricePoint[];
  createdAt: string;
}

/** A user's "notify me when the price drops" request. */
export interface PriceAlert {
  id: string;
  productId: string;
  channel: "email" | "whatsapp";
  contact: string;
  targetPrice: number;
  createdAt: string;
}

/** The whole dataset. In the MVP this is one JSON blob in LocalStorage. */
export interface Catalog {
  version: number;
  industries: Industry[];
  categories: Category[];
  stores: Store[];
  products: Product[];
}

/** Icon names the admin can pick from (see components/CategoryIcon.tsx). */
export type IconName = string;
