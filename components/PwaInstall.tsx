"use client";

/**
 * Registers the service worker and shows a small "install the app" banner on phones:
 * - Android/Chrome: uses the native install prompt.
 * - iPhone/Safari: explains Share → "Add to Home Screen" (iOS has no install prompt API).
 * Dismissal is remembered for 14 days.
 */
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "arkhas:pwa-dismissed";

export function PwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 14 * 86400e3;
    } catch {}
    if (standalone || dismissed || window.location.pathname.startsWith("/admin")) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIos) {
      setIos(true);
      t = setTimeout(() => setVisible(true), 4000);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (t) clearTimeout(t);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div role="dialog" aria-label={tr("تثبيت التطبيق")} className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md sm:inset-x-auto sm:end-4">
      <div className="card flex items-center gap-3 p-3 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="size-11 rounded-xl" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-black">{tr("ثبّت “أرخص” على موبايلك")}</p>
          {ios ? (
            <p className="text-xs text-slate-500">
              {tr("اضغط")} <Share className="inline size-3.5 align-text-bottom" /> {tr("مشاركة ← \"إضافة إلى الشاشة الرئيسية\"")}
            </p>
          ) : (
            <p className="text-xs text-slate-500">{tr("افتح الأسعار بضغطة زي أي تطبيق.")}</p>
          )}
        </div>
        {!ios && prompt && (
          <button type="button" onClick={install} className="btn-primary px-3 py-2">
            <Download className="size-4" /> {tr("تثبيت")}
          </button>
        )}
        <button type="button" onClick={dismiss} aria-label={tr("إغلاق")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
