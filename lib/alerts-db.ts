/**
 * Price alerts stored in Supabase (free tier) through its REST API — no SDK needed.
 * Server-only: uses SUPABASE_SERVICE_KEY, which must never reach the browser.
 * Env (Vercel → Settings → Environment Variables):  SUPABASE_URL, SUPABASE_SERVICE_KEY
 */
const TABLE = "price_alerts_live";

export function alertsConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function headers(extra: Record<string, string> = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY!;
  // New Supabase "secret" keys (sb_secret_…) go in the apikey header only;
  // legacy service_role keys are JWTs (eyJ…) and also need the Bearer header.
  const auth: Record<string, string> = key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {};
  return { apikey: key, ...auth, "Content-Type": "application/json", ...extra };
}

const base = () => `${process.env.SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${TABLE}`;

export interface NewAlert {
  product_id: string;
  product_slug: string;
  product_name: string;
  email: string;
  target_price: number;
  lang: "ar" | "en";
}

/** Creates the alert, or updates the target price if this email already watches this product. */
export async function upsertAlert(a: NewAlert) {
  const res = await fetch(`${base()}?on_conflict=product_id,email`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ ...a, notified_at: null }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
}

export async function deleteAlert(id: string) {
  const res = await fetch(`${base()}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
}
