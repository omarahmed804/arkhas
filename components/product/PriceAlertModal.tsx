"use client";

/**
 * "نبهني لما السعر ينزل" modal. In the MVP, alerts are saved to the repository
 * (LocalStorage) and listed in /admin. In production, a cron job compares
 * target prices with new prices and sends email / WhatsApp messages.
 */
import { Bell, CheckCircle2, Mail, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatEGP, uid } from "@/lib/format";
import { isValidWhatsapp } from "@/lib/offer-link";
import { getRepository } from "@/lib/repository";
import type { Product } from "@/lib/types";
import { tr } from "@/lib/i18n";

export function PriceAlertModal({ product, currentPrice, onClose }: { product: Product; currentPrice?: number; onClose: () => void }) {
  const [channel, setChannel] = useState<"email" | "whatsapp">("whatsapp");
  const [contact, setContact] = useState("");
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
    const price = Number(target);
    if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) return setError(tr("اكتب إيميل صحيح."));
    if (channel === "whatsapp" && !isValidWhatsapp(contact)) return setError(tr("اكتب رقم واتساب صحيح، مثلاً 01012345678."));
    if (!price || price <= 0) return setError(tr("اكتب السعر المستهدف."));
    if (currentPrice && price >= currentPrice) return setError(tr("السعر المستهدف لازم يكون أقل من السعر الحالي ({p}).", { p: formatEGP(currentPrice) }));
    setError("");
    await getRepository().addAlert({
      id: uid("alert"),
      productId: product.id,
      channel,
      contact: contact.trim(),
      targetPrice: price,
      createdAt: new Date().toISOString(),
    });
    setDone(true);
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
              {tr("هنبعتلك على {c} لما يوصل السعر لـ {p} أو أقل.", { c: channel === "email" ? tr("الإيميل") : tr("واتساب"), p: formatEGP(Number(target)) })}
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

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {(
                [
                  ["whatsapp", tr("واتساب"), MessageCircle],
                  ["email", tr("إيميل"), Mail],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setChannel(key);
                    setContact("");
                    setError("");
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition ${channel === key ? "bg-white shadow dark:bg-slate-900" : "text-slate-500"}`}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            <label className="label" htmlFor="alert-contact">{channel === "email" ? tr("الإيميل") : tr("رقم الواتساب")}</label>
            <input
              id="alert-contact"
              ref={firstField}
              type={channel === "email" ? "email" : "tel"}
              inputMode={channel === "email" ? "email" : "tel"}
              dir="ltr"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={channel === "email" ? "name@example.com" : "01012345678"}
              className="input mb-4 text-start"
              autoComplete={channel === "email" ? "email" : "tel"}
            />

            <label className="label" htmlFor="alert-target">{tr("السعر المستهدف (ج.م)")}</label>
            <input id="alert-target" type="number" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} className="input" />
            {currentPrice && <p className="mt-1 text-xs text-slate-500">{tr("السعر الحالي:")} {formatEGP(currentPrice)}</p>}

            {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-bold text-red-600 dark:bg-red-500/10">{error}</p>}

            <button type="submit" className="btn-primary mt-5 w-full py-3">
              <Bell className="size-4" /> {tr("فعّل التنبيه")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
