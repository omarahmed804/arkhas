/**
 * Tiny Arabic ⇄ English switch.
 * Arabic is the source language: every UI string is written in Arabic and passed
 * through tr("..."). In English mode tr() looks the string up in EN; anything
 * missing simply stays Arabic, so a forgotten translation never breaks the page.
 */
import { EN } from "./i18n-en";

export type Lang = "ar" | "en";
export const LANG_KEY = "arkhas-lang";

let current: Lang = "ar";
export const getLang = (): Lang => current;
export const setCurrentLang = (l: Lang) => {
  current = l;
};
export const isEn = () => current === "en";

/** tr("متوفر في {n} متاجر", { n: 3 }) */
export function tr(ar: string, vars?: Record<string, string | number>): string {
  let s = current === "en" ? EN[ar] ?? ar : ar;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Pick the Arabic or English version of a data field. */
export const pick = (ar: string, en?: string) => (current === "en" && en ? en : ar);

/** Free-text data (spec labels/values, delivery times): word-level fallback. */
export function trData(s: string): string {
  if (current !== "en" || !s) return s;
  if (EN[s]) return EN[s];
  return s
    .replace(/(\d+)\s*[–-]\s*(\d+)\s*أيام/g, "$1–$2 days")
    .replace(/(\d+)\s*أيام/g, "$1 days")
    .replace(/(\d+)\s*يوم/g, "$1 day")
    .replace(/(\d+)\s*ساعة/g, "$1 hours")
    .replace(/(\d+)\s*ساعات/g, "$1 hours")
    .replace(/جيجا/g, "GB")
    .replace(/[؀-ۿ]+(\s+[؀-ۿ]+)*/g, (w) => EN[w] ?? w);
}

/** Runs in <head> before paint so an English visitor never sees an RTL flash. */
export const langInitScript = `try{var l=localStorage.getItem("${LANG_KEY}");if(l==="en"){document.documentElement.lang="en";document.documentElement.dir="ltr"}}catch(e){}`;
