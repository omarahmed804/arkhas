/**
 * Data access layer.
 *
 * The UI only talks to the `CatalogRepository` interface. The MVP ships with
 * a LocalStorage implementation so you can add/edit products from /admin
 * immediately, with zero backend.
 *
 * ⚠️ LocalStorage is per-browser: edits you make in /admin are visible only in
 *    YOUR browser. To publish them for everyone in the MVP, use
 *    Admin → "تصدير JSON" and replace data/catalog.json, then redeploy.
 *
 * To go live with a real database, implement this same interface with
 * Supabase (see supabase/schema.sql) and swap it in `getRepository()`.
 */
import seed from "@/data/catalog.json";
import type { Catalog, PriceAlert } from "./types";

export const SEED_CATALOG = seed as Catalog;

export interface CatalogRepository {
  load(): Promise<Catalog>;
  save(catalog: Catalog): Promise<void>;
  reset(): Promise<Catalog>;
  listAlerts(): Promise<PriceAlert[]>;
  addAlert(alert: PriceAlert): Promise<void>;
  deleteAlert(id: string): Promise<void>;
}

const CATALOG_KEY = "arkhas:catalog:v1";
const ALERTS_KEY = "arkhas:alerts:v1";

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // storage disabled (private mode) or corrupted JSON
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("Could not write to localStorage", err);
    throw new Error("تعذر الحفظ في المتصفح (قد تكون مساحة التخزين ممتلئة).");
  }
}

export class LocalStorageRepository implements CatalogRepository {
  async load(): Promise<Catalog> {
    const stored = readJSON<Catalog>(CATALOG_KEY);
    // Only trust stored data that matches the current schema version.
    if (stored && stored.version === SEED_CATALOG.version && Array.isArray(stored.products)) return stored;
    return SEED_CATALOG;
  }
  async save(catalog: Catalog) {
    writeJSON(CATALOG_KEY, catalog);
  }
  async reset() {
    try {
      window.localStorage.removeItem(CATALOG_KEY);
    } catch {}
    return SEED_CATALOG;
  }
  async listAlerts() {
    return readJSON<PriceAlert[]>(ALERTS_KEY) ?? [];
  }
  async addAlert(alert: PriceAlert) {
    writeJSON(ALERTS_KEY, [alert, ...(await this.listAlerts())]);
  }
  async deleteAlert(id: string) {
    writeJSON(ALERTS_KEY, (await this.listAlerts()).filter((a) => a.id !== id));
  }
}

/*
 * Example Supabase implementation (sketch):
 *
 * export class SupabaseRepository implements CatalogRepository {
 *   async load() {
 *     const [ind, cat, st, prod] = await Promise.all([
 *       supabase.from("industries").select("*"),
 *       supabase.from("categories").select("*"),
 *       supabase.from("stores").select("*"),
 *       supabase.from("products").select("*, offers(*), price_history(*), specs:product_specs(*)"),
 *     ]);
 *     return mapRowsToCatalog(ind.data, cat.data, st.data, prod.data);
 *   }
 *   ...
 * }
 */

let repo: CatalogRepository | null = null;
export function getRepository(): CatalogRepository {
  if (!repo) repo = new LocalStorageRepository();
  return repo;
}
