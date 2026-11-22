import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryView } from "@/components/CategoryView";
import { SEED_CATALOG } from "@/lib/repository";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SEED_CATALOG.categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = SEED_CATALOG.categories.find((x) => x.slug === slug);
  return { title: c ? `أسعار ${c.name} في مصر` : "قسم" };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  return (
    <Suspense>
      <CategoryView slug={decodeURIComponent(slug)} />
    </Suspense>
  );
}
