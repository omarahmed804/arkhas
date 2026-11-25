"use client";

/**
 * Thin bar at the top of every page with the discount codes.
 *  - Every store that has a promoCode (data/catalog.json → stores) gets its own line:
 *      "كود خصم من 2B  [FF34 ⧉]  تسوّق ←"
 *  - The banner from Admin → البانر (catalog.promo) is added too, if it's on.
 *  - More than one → they change every few seconds (with small dots to switch by hand).
 * To add a new code (noon, Jumia…): just write promoCode on that store. Nothing else.
 */
import { Check, Copy, Megaphone, TicketPercent, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "./CatalogProvider";
import { isEn, tr } from "@/lib/i18n";
import { withAffiliate } from "@/lib/affiliate";

const DISMISS_KEY = "arkhas:promo-dismissed";
const ROTATE_MS = 5000;

type Slide = { key: string; text: string; code?: string; url?: string; linkLabel?: string; badge?: { t: string; c: string }; banner?: boolean };

export function PromoBar() {
  const { catalog } = useCatalog();
  const en = isEn();

  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    for (const s of catalog.stores) {
      if (!s.promoCode || s.active === false) continue;
      const name = en ? s.nameEn || s.name : s.name;
      const note = en ? s.promoNoteEn : s.promoNote;
      out.push({
        key: `store:${s.id}:${s.promoCode}`,
        text: note || `${tr("كود خصم من")} ${name}`,
        code: s.promoCode,
        url: withAffiliate(s.url, s),
        linkLabel: tr("تسوّق"),
        badge: { t: s.logoText, c: s.color },
      });
    }
    const p = catalog.promo;
    if (p?.enabled && p.text.trim()) out.push({ key: `banner:${p.text}|${p.code ?? ""}`, text: p.text, code: p.code, url: p.url, linkLabel: p.linkLabel || tr("اعرف أكتر"), banner: true });
    return out;
  }, [catalog.stores, catalog.promo, en]);

  const signature = slides.map((s) => s.key).join("~");
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(window.sessionStorage.getItem(DISMISS_KEY) === signature);
    } catch {}
  }, [signature]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  if (!slides.length || hidden) return null;
  const s = slides[i % slides.length];

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  }

  return (
    <div
      className="bg-gradient-to-l from-brand-700 via-brand-600 to-deal-500 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto flex min-h-9 max-w-7xl items-center justify-center px-10 py-1.5 text-center text-[13px] font-bold sm:text-sm">
        <div key={s.key} className="promo-in flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {s.badge ? (
            <span className="grid h-5 min-w-5 place-items-center rounded px-1 text-[10px] font-black leading-none ring-1 ring-white/40" style={{ background: s.badge.c }} aria-hidden>
              {s.badge.t}
            </span>
          ) : s.banner ? (
            <Megaphone className="hidden size-4 shrink-0 sm:block" />
          ) : (
            <TicketPercent className="size-4 shrink-0" />
          )}
          <span>{s.text}</span>
          {s.code && (
            <button
              type="button"
              onClick={() => copy(s.code!)}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/80 bg-white/15 px-2 py-0.5 font-black tracking-wider hover:bg-white/25"
              title={tr("انسخ الكود")}
            >
              <span dir="ltr">{s.code}</span>
              {copied === s.code ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          )}
          {s.url && (
            <a href={s.url} target="_blank" rel="noopener noreferrer sponsored" className="underline underline-offset-2 hover:opacity-90">
              {s.linkLabel}
            </a>
          )}
        </div>

        {slides.length > 1 && (
          <div className="absolute start-2 top-1/2 hidden -translate-y-1/2 gap-1 sm:flex">
            {slides.map((x, n) => (
              <button
                key={x.key}
                type="button"
                aria-label={`${n + 1}`}
                onClick={() => setI(n)}
                className={`size-1.5 rounded-full transition ${n === i % slides.length ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label={tr("إخفاء")}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 opacity-80 hover:bg-white/15 hover:opacity-100"
          onClick={() => {
            setHidden(true);
            try {
              window.sessionStorage.setItem(DISMISS_KEY, signature);
            } catch {}
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
