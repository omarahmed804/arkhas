"use client";

import Link from "next/link";
import { useCatalog } from "./CatalogProvider";
import { ListingView } from "./ListingView";
import { tr } from "@/lib/i18n";

/** Resolves the category from the (possibly admin-edited) catalog, then shows the listing. */
export function CategoryView({ slug }: { slug: string }) {
  const { categoryBySlug, hydrated } = useCatalog();
  const category = categoryBySlug(slug);
  if (!category) {
    if (!hydrated) return <div className="mx-auto h-96 max-w-7xl animate-pulse px-4 py-6"><div className="card size-full" /></div>;
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-black">{tr("القسم غير موجود")}</h1>
        <Link href="/" className="btn-primary mt-6">{tr("الرئيسية")}</Link>
      </div>
    );
  }
  return <ListingView category={category} />;
}
