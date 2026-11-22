import type { Metadata } from "next";
import { ProductView } from "@/components/product/ProductView";
import { formatEGP } from "@/lib/format";
import { bestOffer } from "@/lib/pricing";
import { SEED_CATALOG } from "@/lib/repository";

type Props = { params: Promise<{ slug: string }> };

/** Pre-render every seed product at build time (fast + SEO). Admin-added products render on demand. */
export function generateStaticParams() {
  return SEED_CATALOG.products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = SEED_CATALOG.products.find((x) => x.slug === slug);
  if (!found) return { title: "منتج" };
  const p = { ...found, offers: found.offers.filter((o) => !o.needsCheck) };
  const best = bestOffer(p);
  return {
    title: `سعر ${p.name} في مصر`,
    description: best
      ? `قارن سعر ${p.name} في ${p.offers.length} متاجر في مصر. أقل سعر ${formatEGP(best.price)}.`
      : `قارن سعر ${p.name} في متاجر مصر.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  return <ProductView slug={decodeURIComponent(slug)} />;
}
