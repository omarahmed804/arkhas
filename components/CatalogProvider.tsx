"use client";

/**
 * Global catalog state.
 *
 * Renders with the seed data on the server (so pages are SEO-friendly and
 * fast), then swaps in any admin edits from the repository after hydration.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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

/** Prices older than this are probably wrong — hidden from visitors until the tracker confirms them again. */
const HIDE_AFTER_DAYS = 14;
/** Manual prices (autoTrack off) get longer — re-save them from Admin to keep them visible. */
const HIDE_MANUAL_AFTER_DAYS = 30;

/**
 * What visitors see: only prices we actually confirmed. Unconfirmed offers (needsCheck) and very
 * old prices are hidden instead of showing a warning, and products with no confirmed price are
 * hidden until the tracker confirms one. The admin always sees everything.
 */
export function publicView(c: Catalog, now = Date.now()): Catalog {
  const hidden = new Set(c.stores.filter((s) => s.active === false).map((s) => s.id));
  const products = c.products
    .map((p) => ({ ...p, offers: p.offers.filter(
      (o) => !hidden.has(o.storeId) && !o.needsCheck && now - new Date(o.updatedAt).getTime() < (o.autoTrack === false ? HIDE_MANUAL_AFTER_DAYS : HIDE_AFTER_DAYS) * 86400e3,
    ) }))
    .filter((p) => p.offers.length > 0);
  return { ...c, products, stores: c.stores.filter((s) => !hidden.has(s.id)) };
}

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

  const isAdmin = usePathname()?.startsWith("/admin") ?? false;
  const shown = useMemo(() => (isAdmin ? catalog : publicView(catalog)), [catalog, isAdmin]);

  const value = useMemo<CatalogContextValue>(() => {
    const catalog = shown;
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
  }, [shown, hydrated, update, reset]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}
