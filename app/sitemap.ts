/**
 * /sitemap.xml — every category and product page, so Google indexes them.
 * Submit https://<your-domain>/sitemap.xml once in Google Search Console → Sitemaps.
 * Set NEXT_PUBLIC_SITE_URL in Vercel when you connect your own domain.
 */
import type { MetadataRoute } from "next";
import { SEED_CATALOG } from "@/lib/repository";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://arkhas-seven.vercel.app").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = SEED_CATALOG.updatedAt ? new Date(SEED_CATALOG.updatedAt) : new Date();
  const confirmed = SEED_CATALOG.products.filter((p) => p.offers.some((o) => !o.needsCheck));
  return [
    { url: `${SITE_URL}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    ...SEED_CATALOG.categories.map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      lastModified: updated,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...confirmed.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: updated,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
