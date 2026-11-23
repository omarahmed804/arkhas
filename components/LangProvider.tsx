"use client";

import { Fragment, createContext, useCallback, useContext, useEffect, useState } from "react";
import { LANG_KEY, setCurrentLang, tr, type Lang } from "@/lib/i18n";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "ar", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  // Set synchronously so every child rendered below uses the right language.
  setCurrentLang(lang);

  useEffect(() => {
    try {
      if (localStorage.getItem(LANG_KEY) === "en") setLangState("en");
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
    setLangState(l);
  }, []);

  // Re-mount the tree on switch so every component re-renders in the new language.
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <Fragment key={lang}>{children}</Fragment>
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

/** For server components: <T>نص عربي</T> */
export function T({ children, vars }: { children: string; vars?: Record<string, string | number> }) {
  useLang();
  return <>{tr(children, vars)}</>;
}

/** The ع / EN button in the header. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      aria-label={lang === "ar" ? "Switch to English" : "التحويل للعربي"}
      className="grid h-10 min-w-10 place-items-center rounded-xl px-2 text-sm font-black text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {lang === "ar" ? "EN" : "ع"}
    </button>
  );
}
