import { isEn, tr } from "./i18n";
/** Formatting helpers (Egyptian market, Arabic UI). */

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** 1500 → "1,500 ج.م" (Western digits are the norm on Egyptian e-commerce sites). */
export function formatEGP(value: number): string {
  return isEn() ? `EGP ${numberFmt.format(Math.round(value))}` : `${numberFmt.format(Math.round(value))} ج.م`;
}

export function formatNumber(value: number): string {
  return numberFmt.format(Math.round(value));
}

const rtfAr = new Intl.RelativeTimeFormat("ar-EG-u-nu-latn", { numeric: "auto", style: "long" });
const rtfEn = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "long" });

/** ISO timestamp → "منذ ساعتين" / "منذ ٣ أيام". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = isEn() ? rtfEn : rtfAr;
  if (abs < 60) return tr("الآن");
  if (abs < 3570) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400 - 1800) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
}

/** Arabic plural-aware "available in N stores". */
export function storesCountLabel(n: number): string {
  if (isEn()) return n === 0 ? "Not available right now" : n === 1 ? "Available in 1 store" : `Available in ${n} stores`;
  if (n === 0) return "غير متوفر حاليًا";
  if (n === 1) return "متوفر في متجر واحد";
  if (n === 2) return "متوفر في متجرين";
  if (n <= 10) return `متوفر في ${n} متاجر`;
  return `متوفر في ${n} متجر`;
}

/** Turns any text (Arabic or English) into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/["'’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
