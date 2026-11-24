/** POST /api/alerts — saves a "notify me when the price drops" request. */
import { NextResponse } from "next/server";
import { alertsConfigured, upsertAlert } from "@/lib/alerts-db";
import { SEED_CATALOG } from "@/lib/repository";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  if (!alertsConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: { productId?: string; email?: string; targetPrice?: number; lang?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  // Honeypot field: real visitors never fill it, bots usually do.
  if (body.website) return NextResponse.json({ ok: true });

  const email = String(body.email ?? "").trim().toLowerCase();
  const target = Number(body.targetPrice);
  const product = SEED_CATALOG.products.find((p) => p.id === body.productId);
  if (!product) return NextResponse.json({ error: "product" }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: "email" }, { status: 400 });
  if (!Number.isFinite(target) || target <= 0 || target > 10_000_000) return NextResponse.json({ error: "price" }, { status: 400 });

  try {
    await upsertAlert({
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      email,
      target_price: Math.round(target),
      lang: body.lang === "en" ? "en" : "ar",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
