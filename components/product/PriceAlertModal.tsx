"use client";

/**
 * "نبهني لما السعر ينزل" modal.
 * Saves the alert on the server (/api/alerts → Supabase). Every 6 hours the GitHub
 * price tracker compares new prices with the targets and emails the visitor
 * (scripts/send-alerts.mjs). WhatsApp has no free sending API, so alerts are email-only.
 */
import { Bell, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatEGP } from "@/lib/format";
import type { Product } from "@/lib/types";
import { getLang, tr } from "@/lib/i18n";

export function PriceAlertModal({ product, currentPrice, onClose }: { product: Product; currentPrice?: number; onClose: () => void }) {
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(currentPrice ? String(Math.round((currentPrice * 0.95) / 10) * 10) : "");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const price = Number(target);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.trim())) return setError(tr("اكتب إيميل صحيح."));
    if (!price || price <= 0) return setError(tr("اكتب السعر المستهدف."));
    if (currentPrice && price >= currentPrice) return setError(tr("السعر المستهدف لازم يكون أقل من السعر الحالي ({p}).", { p: formatEGP(currentPrice) }));
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, email: contact.trim(), targetPrice: price, lang: getLang() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setDone(true);
    } catch {
      setError(tr("حصلت مشكلة ومقدرناش نحفظ التنبيه. جرب تاني بعد شوية."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="alert-title">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6 dark:bg-slate-900">
        <button type="button" onClick={onClose} aria-label={tr("إغلاق")} className="absolute end-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="size-5" />
        </button>

        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-14 text-deal-500" />
            <h2 className="text-xl font-black">{tr("تمام! هنبلغك أول ما السعر ينزل")}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {tr("هنبعتلك إيميل لما يوصل السعر لـ {p} أو أقل.", { p: formatEGP(Number(target)) })}
            </p>
            <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">{tr("تمام")}</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-slate-800">
                <Bell className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 id="alert-title" className="text-lg font-black">{tr("نبهني لما السعر ينزل")}</h2>
                <p className="ltr truncate text-start text-xs text-slate-500">{product.name}</p>
              </div>
            </div>

            <label className="label" htmlFor="alert-contact">{tr("الإيميل")}</label>
            <input
              id="alert-contact"
              ref={firstField}
              type="email"
              inputMode="email"
              dir="ltr"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="name@example.com"
              className="input mb-4 text-start"
              autoComplete="email"
            />

            <label className="label" htmlFor="alert-target">{tr("السعر المستهدف (ج.م)")}</label>
            <input id="alert-target" type="number" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} className="input" />
            {currentPrice && <p className="mt-1 text-xs text-slate-500">{tr("السعر الحالي:")} {formatEGP(currentPrice)}</p>}

            {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-bold text-red-600 dark:bg-red-500/10">{error}</p>}

            <button type="submit" disabled={busy} className="btn-primary mt-5 w-full py-3 disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />} {tr("فعّل التنبيه")}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">{tr("هنبعتلك إيميل واحد بس لما السعر يوصل للي إنت عايزه، وتقدر تلغي في أي وقت.")}</p>
          </form>
        )}
      </div>
    </div>
  );
}
