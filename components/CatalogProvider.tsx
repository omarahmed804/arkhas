"use client";

/**
 * Global catalog state.
 *
 * Renders with the seed data on the server (so pages are SEO-friendly and
 * fast), then swaps in any admin edits from the repository after hydration.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getRepository, SEED_CATALOG } from "@/lib/repository";
import type { Catalog, Category, Industry, Product, Store } from "@/lib/types";

interface CatalogContextValue {
  catalog: Catalog;
  hydrated: boolean;
  /** Replace the whole catalog and persist it. */
  update: (updater: (c: Catalog) => Catalog) => Promise<void>;
  reset: () => Promise<void>;
  storeById: (id: string) => Store | undefined;
  categoryById: (id: string) => Category | undefined;
  categoryBySlug: (slug: string) => Category | undefined;
  industryById: (id: string) => Industry | undefined;
  productBySlug: (slug: string) => Product | undefined;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(SEED_CATALOG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    getRepository()
      .load()
      .then((c) => alive && setCatalog(c))
      .finally(() => alive && setHydrated(true));
    return () => {
      alive = false;
    };
  }, []);

  // Ref mirrors state so `update` always builds on the latest catalog.
  const ref = useRef(catalog);
  ref.current = catalog;

  const update = useCallback(async (updater: (c: Catalog) => Catalog) => {
    const next = { ...updater(ref.current), updatedAt: new Date().toISOString() };
    ref.current = next;
    setCatalog(next);
    await getRepository().save(next);
  }, []);

  const reset = useCallback(async () => {
    setCatalog(await getRepository().reset());
  }, []);

  const value = useMemo<CatalogContextValue>(() => {
    const stores = new Map(catalog.stores.map((s) => [s.id, s]));
    const cats = new Map(catalog.categories.map((c) => [c.id, c]));
    const inds = new Map(catalog.industries.map((i) => [i.id, i]));
    return {
      catalog,
      hydrated,
      update,
      reset,
      storeById: (id) => stores.get(id),
      categoryById: (id) => cats.get(id),
      categoryBySlug: (slug) => catalog.categories.find((c) => c.slug === slug),
      industryById: (id) => inds.get(id),
      productBySlug: (slug) => catalog.products.find((p) => p.slug === slug),
    };
  }, [catalog, hydrated, update, reset]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}
