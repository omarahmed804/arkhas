"use client";

/**
 * Announcement bar at the top of every page, e.g. "استخدم كود ARKHAS10 وخد خصم 10%".
 * Text, code and link are edited from Admin → البانر (stored in catalog.promo).
 */
import { Check, Copy, Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCatalog } from "./CatalogProvider";
import { tr } from "@/lib/i18n";

const DISMISS_KEY = "arkhas:promo-dismissed";

export function PromoBar() {
  const { catalog } = useCatalog();
  const promo = catalog.promo;
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);
  const signature = promo ? `${promo.text}|${promo.code ?? ""}` : "";

  useEffect(() => {
    try {
      setHidden(window.sessionStorage.getItem(DISMISS_KEY) === signature);
    } catch {}
  }, [signature]);

  if (!promo?.enabled || !promo.text.trim() || hidden) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(promo!.code ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="bg-gradient-to-l from-brand-700 via-brand-600 to-deal-500 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-10 py-2 text-center text-sm font-bold relative">
        <Megaphone className="hidden size-4 shrink-0 sm:block" />
        <span>{promo.text}</span>
        {promo.code && (
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/70 bg-white/15 px-2 py-0.5 font-black tracking-wider hover:bg-white/25"
            title={tr("انسخ الكود")}
          >
            <span dir="ltr">{promo.code}</span>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        )}
        {promo.url && (
          <a href={promo.url} target="_blank" rel="noopener noreferrer sponsored" className="underline underline-offset-2 hover:opacity-90">
            {promo.linkLabel || tr("اعرف أكتر")}
          </a>
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
