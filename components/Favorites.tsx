"use client";

/**
 * Favorites (♡) — no account needed. Saved in this browser only (localStorage).
 * For each product we keep the price when it was saved, so the Favorites page can say
 * "نزل 1,200 ج.م من ساعة ما حفظته".
 */
import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";

const KEY = "arkhas:favorites";
const EVENT = "arkhas:favorites-changed";

export type FavEntry = { price?: number; at: string };
export type FavMap = Record<string, FavEntry>; // productId → entry

function read(): FavMap {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function write(m: FavMap) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Live favorites list (updates in every component and every open tab). */
export function useFavorites() {
  const [favs, setFavs] = useState<FavMap>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setFavs(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    favs,
    ready,
    has: (id: string) => !!favs[id],
    toggle: (id: string, price?: number) => {
      const m = read();
      if (m[id]) delete m[id];
      else m[id] = { price, at: new Date().toISOString() };
      write(m);
    },
    remove: (id: string) => {
      const m = read();
      delete m[id];
      write(m);
    },
  };
}

/** ♡ button. variant "card" = small round button on a product card; "full" = button with text. */
export function FavButton({ productId, price, variant = "card" }: { productId: string; price?: number; variant?: "card" | "full" }) {
  const { has, toggle } = useFavorites();
  const on = has(productId);
  const label = on ? tr("شيلها من المفضلة") : tr("ضيفها للمفضلة");

  function click(e: React.MouseEvent) {
    e.preventDefault(); // the card is a link — don't open the product
    e.stopPropagation();
    toggle(productId, price);
  }

  if (variant === "full") {
    return (
      <button type="button" onClick={click} aria-pressed={on} className={`btn-ghost w-full py-3 ${on ? "text-rose-600" : ""}`}>
        <Heart className={`size-4 ${on ? "fill-rose-500 text-rose-500" : ""}`} /> {on ? tr("في المفضلة") : tr("ضيفها للمفضلة")}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-full bg-white/90 shadow ring-1 ring-black/5 transition hover:scale-110 dark:bg-slate-900/90"
    >
      <Heart className={`size-[18px] transition ${on ? "fill-rose-500 text-rose-500" : "text-slate-500"}`} />
    </button>
  );
}

/** ♡ in the header with the number of saved products. */
export function FavHeaderLink() {
  const { favs } = useFavorites();
  const n = Object.keys(favs).length;
  return (
    <Link
      href="/favorites"
      aria-label={tr("المفضلة")}
      title={tr("المفضلة")}
      className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Heart className={`size-5 ${n ? "fill-rose-500 text-rose-500" : ""}`} />
      {n > 0 && (
        <span className="absolute -top-0.5 -end-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-4 text-white">{n}</span>
      )}
    </Link>
  );
}
