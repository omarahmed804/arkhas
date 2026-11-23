"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";

/** Inline script (rendered in <head>) that applies the saved theme before paint — no flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('arkhas:theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("arkhas:theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? tr("الوضع الفاتح") : tr("الوضع الداكن")}
      className="grid size-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
