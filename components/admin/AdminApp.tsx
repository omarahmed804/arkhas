"use client";

/**
 * /admin — manage products, prices, stores, industries/categories and alerts.
 * MVP persistence: LocalStorage via lib/repository.ts (per-browser!).
 */
import {
  AlertTriangle, Bell, Megaphone, Boxes, CloudDownload, RefreshCw, Check, Database, Download, ExternalLink, Layers, LogOut, Package, Pencil, Plus,
  RotateCcw, Save, Search, Store as StoreIcon, Trash2, Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "../CatalogProvider";
import { DynamicIcon, ICON_NAMES } from "../DynamicIcon";
import { normalize } from "../SearchBox";
import { StoreLogo, TimeAgo } from "../ui";
import { ProductEditor } from "./ProductEditor";
import { logout } from "@/app/admin/actions";
import { formatEGP, slugify, uid } from "@/lib/format";
import { offerCta } from "@/lib/offer-link";
import { bestOffer, isStale, withTodayHistory } from "@/lib/pricing";
import { getRepository, SEED_CATALOG } from "@/lib/repository";
import type { Catalog, Category, Industry, PriceAlert, Product, Promo, Store } from "@/lib/types";

type Tab = "products" | "stores" | "categories" | "promo" | "alerts" | "data";
const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "products", label: "المنتجات والأسعار", icon: Package },
  { key: "stores", label: "المتاجر", icon: StoreIcon },
  { key: "categories", label: "الأقسام والمجالات", icon: Layers },
  { key: "promo", label: "البانر والبرومو كود", icon: Megaphone },
  { key: "alerts", label: "تنبيهات الأسعار", icon: Bell },
  { key: "data", label: "البيانات", icon: Database },
];

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("products");
  const [toast, setToast] = useState("");
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">لوحة التحكم</h1>
          <p className="text-sm text-slate-500">التعديلات بتتحفظ في المتصفح ده بس (نسخة MVP). صدّر JSON عشان تنشرها للكل.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn-ghost">عرض الموقع <ExternalLink className="size-4" /></Link>
          <RefreshNowButton notify={notify} />
          <form action={logout}>
            <button type="submit" className="btn-ghost text-red-600"><LogOut className="size-4" /> خروج</button>
          </form>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`btn shrink-0 ${tab === key ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800"}`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <LiveDataBanner notify={notify} />
      {tab === "products" && <ProductsTab notify={notify} />}
      {tab === "stores" && <StoresTab notify={notify} />}
      {tab === "categories" && <CategoriesTab notify={notify} />}
      {tab === "promo" && <PromoTab notify={notify} />}
      {tab === "alerts" && <AlertsTab />}
      {tab === "data" && <DataTab notify={notify} />}

      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-6 z-[60] mx-auto flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-slate-900">
          <Check className="size-4 text-deal-500" /> {toast}
        </div>
      )}
    </div>
  );
}

type Notify = { notify: (msg: string) => void };

/**
 * The tracker updates data/catalog.json on GitHub. If that live file is newer than the copy
 * saved in this browser, offer to load it so admin edits don't overwrite fresh prices.
 */
function LiveDataBanner({ notify }: Notify) {
  const { catalog, hydrated, reset } = useCatalog();
  const live = SEED_CATALOG.updatedAt ?? "";
  if (!hydrated || catalog === SEED_CATALOG || !live || live <= (catalog.updatedAt ?? "")) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
      <CloudDownload className="size-5 shrink-0" />
      <p className="flex-1">
        فيه أسعار أحدث على الموقع (اتحدثت <TimeAgo iso={live} />) من النسخة المحفوظة في المتصفح ده. حمّلها قبل ما تعدّل عشان متكتبش فوق الأسعار الجديدة.
      </p>
      <button
        type="button"
        className="btn bg-amber-600 text-white hover:bg-amber-700"
        onClick={async () => {
          if (!confirm("هيتم استبدال تعديلاتك المحلية بأحدث نسخة من الموقع. تكمل؟")) return;
          await reset();
          notify("تم تحميل أحدث الأسعار");
        }}
      >
        حمّل أحدث نسخة
      </button>
    </div>
  );
}

function RefreshNowButton({ notify }: Notify) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="btn-primary"
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fetch("/api/admin/refresh-prices", { method: "POST" });
          const d = (await r.json()) as { ok: boolean; message: string };
          if (d.ok) notify(d.message);
          else alert(d.message);
        } catch {
          alert("حصل خطأ في الاتصال.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> حدّث الأسعار الآن
    </button>
  );
}

/** Offers whose price is old or whose automatic check failed. */
function PriceHealth() {
  const { catalog } = useCatalog();
  let stale = 0;
  let failed = 0;
  let tracked = 0;
  for (const p of catalog.products)
    for (const o of p.offers) {
      if (isStale(o.updatedAt) || o.needsCheck) stale++;
      if (o.lastCheckError) failed++;
      if (o.lastCheckedAt && !o.lastCheckError) tracked++;
    }
  return (
    <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
      <div className="card p-3"><p className="text-lg font-black text-brand-600">{tracked}</p>متابَع تلقائيًا</div>
      <div className="card p-3"><p className={`text-lg font-black ${failed ? "text-red-600" : ""}`}>{failed}</p>فشلت متابعته</div>
      <div className="card p-3"><p className={`text-lg font-black ${stale ? "text-amber-600" : ""}`}>{stale}</p>محتاج تأكيد</div>
    </div>
  );
}

/* ───────────────────────── Products & quick price updates ───────────────────────── */

function ProductsTab({ notify }: Notify) {
  const { catalog, update, storeById, categoryById } = useCatalog();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const products = useMemo(() => {
    const t = normalize(q);
    return t ? catalog.products.filter((p) => normalize(`${p.name} ${p.nameAr ?? ""} ${p.brand}`).includes(t)) : catalog.products;
  }, [catalog.products, q]);

  async function remove(p: Product) {
    if (!confirm(`حذف “${p.name}”؟`)) return;
    await update((c) => ({ ...c, products: c.products.filter((x) => x.id !== p.id) }));
    notify("تم حذف المنتج");
  }

  return (
    <>
      <PriceHealth />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="input ps-9" placeholder="ابحث في المنتجات…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing("new")} disabled={!catalog.categories.length}>
          <Plus className="size-4" /> منتج جديد
        </button>
      </div>

      <div className="space-y-2">
        {products.map((p) => {
          const best = bestOffer(p);
          const open = expanded === p.id;
          return (
            <div key={p.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setExpanded(open ? null : p.id)} aria-expanded={open}>
                  <p className="ltr truncate text-start text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {categoryById(p.categoryId)?.name ?? "بدون قسم"} · {p.offers.length} متاجر ·{" "}
                    {best ? <span className="font-bold text-deal-600">{formatEGP(best.price)}</span> : "غير متوفر"}
                  </p>
                </button>
                <button type="button" className="btn-ghost px-2.5 py-2 text-xs" onClick={() => setExpanded(open ? null : p.id)}>
                  {open ? "إخفاء" : "تحديث الأسعار"}
                </button>
                <button type="button" aria-label="تعديل" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setEditing(p)}>
                  <Pencil className="size-4" />
                </button>
                <button type="button" aria-label="حذف" className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => remove(p)}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              {open && <QuickPrices product={p} storeById={storeById} onSaved={() => notify("تم تحديث الأسعار")} />}
            </div>
          );
        })}
        {products.length === 0 && <p className="card p-8 text-center text-sm text-slate-500">مفيش منتجات.</p>}
      </div>

      {editing && <ProductEditor product={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Inline price/stock editor — the fastest way to update prices daily. */
function QuickPrices({ product, storeById, onSaved }: { product: Product; storeById: (id: string) => Store | undefined; onSaved: () => void }) {
  const { update } = useCatalog();
  const [rows, setRows] = useState(() => product.offers.map((o) => ({ ...o })));
  const dirty = JSON.stringify(rows) !== JSON.stringify(product.offers);

  async function save() {
    const now = new Date().toISOString();
    const offers = rows.map((r, i) => {
      if (JSON.stringify(r) === JSON.stringify(product.offers[i])) return r;
      const { needsCheck: _n, ...rest } = r; // a price you entered yourself counts as confirmed
      return { ...rest, updatedAt: now };
    });
    if (offers.some((o) => !(o.price > 0))) return alert("كل الأسعار لازم تكون أكبر من صفر.");
    const next = withTodayHistory({ ...product, offers });
    await update((c) => ({ ...c, products: c.products.map((p) => (p.id === next.id ? next : p)) }));
    onSaved();
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      {rows.length === 0 && <p className="text-sm text-slate-500">مفيش متاجر — استخدم زرار التعديل لإضافة متاجر.</p>}
      <div className="space-y-2">
        {rows.map((r, i) => {
          const s = storeById(r.storeId);
          const cta = offerCta(r, product);
          return (
            <div key={r.storeId} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              {s && <StoreLogo store={s} size="sm" />}
              <div className="min-w-24 flex-1">
                <p className="text-sm font-bold">{s?.name ?? r.storeId}</p>
                <p className={`text-[11px] ${isStale(r.updatedAt) ? "text-amber-600" : "text-slate-500"}`}>
                  {cta.label} · آخر تحديث <TimeAgo iso={r.updatedAt} />
                  {r.autoTrack === false && " · يدوي"}
                  {r.needsCheck && " · لسه متأكدش"}
                </p>
                {r.lastCheckError && <p className="text-[11px] font-bold text-red-600">المتابعة الآلية: {r.lastCheckError}</p>}
              </div>
              <input
                type="number"
                aria-label={`سعر ${s?.name}`}
                className="input w-32 py-2 font-bold"
                value={r.price || ""}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))}
              />
              <label className="flex items-center gap-1.5 text-xs font-bold">
                <input type="checkbox" className="size-4 accent-deal-500" checked={r.inStock} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, inStock: e.target.checked } : x)))} />
                متوفر
              </label>
            </div>
          );
        })}
      </div>
      {rows.length > 0 && (
        <button type="button" className="btn-deal mt-3 w-full sm:w-auto" disabled={!dirty} onClick={save}>
          <Save className="size-4" /> حفظ الأسعار
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── Stores ───────────────────────── */

const emptyStore = (): Store => ({ id: "", name: "", nameEn: "", url: "", logoText: "", color: "#2563EB", trusted: false, featured: false });

function StoresTab({ notify }: Notify) {
  const { catalog, update } = useCatalog();
  const [form, setForm] = useState<Store | null>(null);
  const isNew = form ? !catalog.stores.some((s) => s.id === form.id) : false;

  async function save() {
    if (!form) return;
    if (!form.name.trim() || !form.logoText.trim()) return alert("اسم المتجر واختصار اللوجو مطلوبين.");
    const store = { ...form, id: form.id || slugify(form.nameEn || form.name) || uid("store") };
    await update((c) => ({ ...c, stores: isNew ? [...c.stores, store] : c.stores.map((s) => (s.id === store.id ? store : s)) }));
    setForm(null);
    notify("تم حفظ المتجر");
  }

  async function remove(s: Store) {
    const used = catalog.products.filter((p) => p.offers.some((o) => o.storeId === s.id)).length;
    if (!confirm(used ? `المتجر ده عليه أسعار في ${used} منتج وهتتشال كلها. متأكد؟` : `حذف ${s.name}؟`)) return;
    await update((c) => ({
      ...c,
      stores: c.stores.filter((x) => x.id !== s.id),
      products: c.products.map((p) => ({ ...p, offers: p.offers.filter((o) => o.storeId !== s.id) })),
    }));
    notify("تم حذف المتجر");
  }

  return (
    <>
      <button type="button" className="btn-primary mb-4" onClick={() => setForm(emptyStore())}>
        <Plus className="size-4" /> متجر جديد
      </button>

      {form && (
        <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2">
          <h3 className="font-black sm:col-span-2">{isNew ? "إضافة متجر" : `تعديل ${form.name}`}</h3>
          <Field label="الاسم بالعربي"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="الاسم بالإنجليزي"><input className="input ltr text-start" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></Field>
          <Field label="رابط المتجر / الصفحة (اختياري للمتاجر اللي على واتساب بس)"><input className="input ltr text-start" placeholder="https://" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
          <Field label="رابط صورة اللوجو (اختياري)"><input className="input ltr text-start" value={form.logoUrl ?? ""} onChange={(e) => setForm({ ...form, logoUrl: e.target.value || undefined })} /></Field>
          <Field label="كود الأفلييت (يتضاف لكل رابط) — مثال أمازون: tag=arkhas-21"><input className="input ltr text-start" placeholder="tag=yourid-21" value={form.affiliateParams ?? ""} onChange={(e) => setForm({ ...form, affiliateParams: e.target.value || undefined })} /></Field>
          <Field label="أو رابط شبكة أفلييت (حط {url} مكان رابط المنتج)"><input className="input ltr text-start" placeholder="https://network.com/click?id=123&url={url}" value={form.affiliateTemplate ?? ""} onChange={(e) => setForm({ ...form, affiliateTemplate: e.target.value || undefined })} /></Field>
          <Field label="طريقة متابعة الأسعار الآلية">
            <select className="input" value={form.platform ?? ""} onChange={(e) => setForm({ ...form, platform: (e.target.value || undefined) as Store["platform"] })}>
              <option value="">عادي — من صفحة المنتج</option>
              <option value="shopify">متجر Shopify (زي الشامي ودريم 2000) — دقيق + بيضيف عروض جديدة لوحده</option>
              <option value="amazon">أمازون — عن طريق Amazon API</option>
            </select>
          </Field>
          <Field label="رقم الخط الساخن (اختياري)"><input className="input ltr text-start" placeholder="17797" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value || undefined })} /></Field>
          <Field label="حالة الاتفاق على برومو كود">
            <select className="input" value={form.partnerStatus ?? "none"} onChange={(e) => setForm({ ...form, partnerStatus: e.target.value as Store["partnerStatus"] })}>
              <option value="none">لسه مكلمتهمش</option>
              <option value="contacted">كلمتهم ومستني الرد</option>
              <option value="partner">اتفقنا ✓</option>
              <option value="no-reply">مردوش / رفضوا</option>
            </select>
          </Field>
          <Field label="ملاحظات (مين كلمت، إمتى…)"><input className="input" value={form.partnerNotes ?? ""} onChange={(e) => setForm({ ...form, partnerNotes: e.target.value || undefined })} /></Field>
          <Field label="البرومو كود بتاعك في المتجر ده (بيظهر جنب كل سعر)"><input className="input ltr text-start" placeholder="ARKHAS" value={form.promoCode ?? ""} onChange={(e) => setForm({ ...form, promoCode: e.target.value || undefined })} /></Field>
          <Field label="وصف الكود (اختياري)"><input className="input" placeholder="خصم 5% بكود" value={form.promoNote ?? ""} onChange={(e) => setForm({ ...form, promoNote: e.target.value || undefined })} /></Field>
          <Field label="اختصار اللوجو (1–3 حروف)"><input className="input" maxLength={3} value={form.logoText} onChange={(e) => setForm({ ...form, logoText: e.target.value })} /></Field>
          <Field label="لون البراند">
            <div className="flex gap-2">
              <input type="color" className="h-[42px] w-14 cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              <StoreLogo store={form} />
            </div>
          </Field>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="size-4 accent-brand-600" checked={form.trusted} onChange={(e) => setForm({ ...form, trusted: e.target.checked })} /> متجر موثوق</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="size-4 accent-brand-600" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked ? undefined : false })} /> ظاهر في الموقع</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="size-4 accent-brand-600" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> يظهر في الرئيسية</label>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>إلغاء</button>
            <button type="button" className="btn-primary flex-1" onClick={save}><Save className="size-4" /> حفظ</button>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {catalog.stores.map((s) => (
          <div key={s.id} className="card flex items-center gap-3 p-3">
            <StoreLogo store={s} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{s.name}</p>
              <p className="ltr truncate text-start text-xs text-slate-500">{s.url || "بدون موقع"}</p>
              {(s.affiliateParams || s.affiliateTemplate) && <p className="text-[11px] font-bold text-deal-600">أفلييت مفعّل ✓</p>}
              <p className="text-[11px] text-slate-500">
                {catalog.products.filter((p) => p.offers.some((o) => o.storeId === s.id && !o.needsCheck)).length} سعر ظاهر
                {s.active === false && " · مخفي من الموقع"}
                {s.partnerStatus === "partner" && " · اتفقنا ✓"}
                {s.partnerStatus === "contacted" && " · مستني الرد"}
                {s.partnerStatus === "no-reply" && " · مردوش"}
                {s.promoCode && ` · كود: ${s.promoCode}`}
              </p>
            </div>
            <button type="button" aria-label="تعديل" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setForm({ ...s })}><Pencil className="size-4" /></button>
            <button type="button" aria-label="حذف" className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => remove(s)}><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────────────────── Promo bar ───────────────────────── */

function PromoTab({ notify }: Notify) {
  const { catalog, update } = useCatalog();
  const [form, setForm] = useState<Promo>(() => catalog.promo ?? { enabled: false, text: "" });

  async function save() {
    await update((c) => ({ ...c, promo: { ...form, text: form.text.trim(), code: form.code?.trim() || undefined, url: form.url?.trim() || undefined } }));
    notify("تم حفظ البانر — صدّر الـ JSON من تبويب البيانات عشان يظهر للكل");
  }

  return (
    <div className="card grid gap-3 p-4 sm:grid-cols-2">
      <h3 className="font-black sm:col-span-2">شريط الإعلان اللي فوق الموقع</h3>
      <p className="text-sm text-slate-500 sm:col-span-2">مثال: النص “استخدم كود” + الكود “ARKHAS10” + “وخد خصم 10% على نون”. الكود بيظهر كزرار الزائر يدوس عليه فيتنسخ.</p>
      <Field label="النص"><input className="input" placeholder="استخدم كود وخد خصم 10% على نون" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></Field>
      <Field label="البرومو كود (اختياري)"><input className="input ltr text-start" placeholder="ARKHAS10" value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
      <Field label="رابط (اختياري)"><input className="input ltr text-start" placeholder="https://" value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
      <Field label="كلمة الرابط"><input className="input" placeholder="اعرف أكتر" value={form.linkLabel ?? ""} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
        <input type="checkbox" className="size-4 accent-brand-600" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> اظهر البانر في الموقع
      </label>
      <button type="button" className="btn-primary sm:col-span-2" onClick={save}><Save className="size-4" /> حفظ</button>
    </div>
  );
}

/* ───────────────────────── Industries & categories ───────────────────────── */

function CategoriesTab({ notify }: Notify) {
  const { catalog, update } = useCatalog();
  const [ind, setInd] = useState<Industry | null>(null);
  const [cat, setCat] = useState<Category | null>(null);

  async function saveIndustry() {
    if (!ind || !ind.name.trim()) return;
    const exists = catalog.industries.some((i) => i.id === ind.id);
    const next = { ...ind, slug: ind.slug || slugify(ind.nameEn || ind.name) };
    await update((c) => ({ ...c, industries: exists ? c.industries.map((i) => (i.id === next.id ? next : i)) : [...c.industries, next] }));
    setInd(null);
    notify("تم حفظ المجال");
  }

  async function saveCategory() {
    if (!cat || !cat.name.trim()) return;
    const slug = cat.slug || slugify(cat.nameEn || cat.name);
    if (catalog.categories.some((c) => c.slug === slug && c.id !== cat.id)) return alert("الرابط (slug) مستخدم لقسم تاني.");
    const exists = catalog.categories.some((c) => c.id === cat.id);
    const next = { ...cat, slug };
    await update((c) => ({ ...c, categories: exists ? c.categories.map((x) => (x.id === next.id ? next : x)) : [...c.categories, next] }));
    setCat(null);
    notify("تم حفظ القسم");
  }

  async function removeCategory(c: Category) {
    const used = catalog.products.filter((p) => p.categoryId === c.id).length;
    if (used) return alert(`القسم فيه ${used} منتج. انقلهم لقسم تاني الأول.`);
    if (!confirm(`حذف قسم ${c.name}؟`)) return;
    await update((x) => ({ ...x, categories: x.categories.filter((y) => y.id !== c.id) }));
  }

  async function removeIndustry(i: Industry) {
    if (catalog.categories.some((c) => c.industryId === i.id)) return alert("المجال فيه أقسام. احذفها أو انقلها الأول.");
    if (!confirm(`حذف مجال ${i.name}؟`)) return;
    await update((x) => ({ ...x, industries: x.industries.filter((y) => y.id !== i.id) }));
  }

  const newCategory = (industryId: string): Category => ({
    id: uid("cat"), industryId, name: "", nameEn: "", slug: "", icon: "Package",
    sortOrder: catalog.categories.filter((c) => c.industryId === industryId).length + 1,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-700 dark:bg-brand-600/10 dark:text-brand-100">
        <b>المجالات</b> (Gaming، موبايلات، أجهزة منزلية، فاشون…) بتحتوي على <b>أقسام</b>. أي قسم جديد بيظهر تلقائيًا في القائمة والفلاتر وعلى رابط <span className="ltr">/category/slug</span> من غير أي كود.
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={() => setInd({ id: uid("ind"), name: "", nameEn: "", slug: "", icon: "Smartphone", sortOrder: catalog.industries.length + 1 })}
      >
        <Plus className="size-4" /> مجال جديد
      </button>

      {ind && (
        <div className="card grid gap-3 p-4 sm:grid-cols-3">
          <Field label="اسم المجال"><input className="input" placeholder="الموبايلات" value={ind.name} onChange={(e) => setInd({ ...ind, name: e.target.value })} /></Field>
          <Field label="بالإنجليزي"><input className="input ltr text-start" placeholder="Smartphones" value={ind.nameEn} onChange={(e) => setInd({ ...ind, nameEn: e.target.value })} /></Field>
          <Field label="الأيقونة"><IconPicker value={ind.icon} onChange={(icon) => setInd({ ...ind, icon })} /></Field>
          <div className="flex gap-2 sm:col-span-3">
            <button type="button" className="btn-ghost" onClick={() => setInd(null)}>إلغاء</button>
            <button type="button" className="btn-primary flex-1" onClick={saveIndustry}><Save className="size-4" /> حفظ المجال</button>
          </div>
        </div>
      )}

      {[...catalog.industries].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => (
        <div key={i.id} className="card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white"><DynamicIcon name={i.icon} className="size-5" /></span>
            <h3 className="flex-1 font-black">{i.name} <span className="ltr text-xs font-medium text-slate-500">{i.nameEn}</span></h3>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setCat(newCategory(i.id))}><Plus className="size-4" /> قسم</button>
            <button type="button" aria-label="تعديل المجال" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setInd({ ...i })}><Pencil className="size-4" /></button>
            <button type="button" aria-label="حذف المجال" className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => removeIndustry(i)}><Trash2 className="size-4" /></button>
          </div>

          {cat && cat.industryId === i.id && (
            <div className="mb-3 grid gap-3 rounded-xl border border-brand-500/40 p-3 sm:grid-cols-2">
              <Field label="اسم القسم"><input className="input" value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} /></Field>
              <Field label="بالإنجليزي"><input className="input ltr text-start" value={cat.nameEn} onChange={(e) => setCat({ ...cat, nameEn: e.target.value })} /></Field>
              <Field label="الرابط (slug) — يتولد تلقائيًا لو فاضي"><input className="input ltr text-start" value={cat.slug} onChange={(e) => setCat({ ...cat, slug: slugify(e.target.value) })} /></Field>
              <Field label="الترتيب"><input type="number" className="input" value={cat.sortOrder} onChange={(e) => setCat({ ...cat, sortOrder: Number(e.target.value) })} /></Field>
              <div className="sm:col-span-2"><Field label="الأيقونة"><IconPicker value={cat.icon} onChange={(icon) => setCat({ ...cat, icon })} /></Field></div>
              <div className="flex gap-2 sm:col-span-2">
                <button type="button" className="btn-ghost" onClick={() => setCat(null)}>إلغاء</button>
                <button type="button" className="btn-primary flex-1" onClick={saveCategory}><Save className="size-4" /> حفظ القسم</button>
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {catalog.categories.filter((c) => c.industryId === i.id).sort((a, b) => a.sortOrder - b.sortOrder).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                <DynamicIcon name={c.icon} className="size-5 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="ltr truncate text-start text-xs text-slate-500">/category/{c.slug}</p>
                </div>
                <button type="button" aria-label="تعديل" className="rounded-lg p-1.5 hover:bg-white dark:hover:bg-slate-700" onClick={() => setCat({ ...c })}><Pencil className="size-4" /></button>
                <button type="button" aria-label="حذف" className="rounded-lg p-1.5 text-red-500 hover:bg-white dark:hover:bg-slate-700" onClick={() => removeCategory(c)}><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ICON_NAMES.map((n) => (
        <button
          key={n}
          type="button"
          title={n}
          onClick={() => onChange(n)}
          className={`grid size-9 place-items-center rounded-lg ring-1 transition ${value === n ? "bg-brand-600 text-white ring-brand-600" : "ring-slate-200 hover:bg-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"}`}
        >
          <DynamicIcon name={n} className="size-4" />
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

/* ───────────────────────── Alerts ───────────────────────── */

function AlertsTab() {
  const { catalog } = useCatalog();
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  useEffect(() => {
    getRepository().listAlerts().then(setAlerts);
  }, []);
  const byId = new Map(catalog.products.map((p) => [p.id, p]));

  async function remove(id: string) {
    await getRepository().deleteAlert(id);
    setAlerts(await getRepository().listAlerts());
  }

  if (!alerts) return null;
  if (!alerts.length) return <p className="card p-8 text-center text-sm text-slate-500">لسه مفيش تنبيهات. جرب “نبهني لما السعر ينزل” من صفحة أي منتج.</p>;

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const p = byId.get(a.productId);
        const best = p && bestOffer(p);
        const reached = best && best.price <= a.targetPrice;
        return (
          <div key={a.id} className="card flex flex-wrap items-center gap-3 p-3">
            <Bell className={`size-5 ${reached ? "text-deal-500" : "text-slate-400"}`} />
            <div className="min-w-0 flex-1">
              <p className="ltr truncate text-start text-sm font-bold">{p?.name ?? "منتج محذوف"}</p>
              <p className="text-xs text-slate-500">
                <span className="ltr">{a.contact}</span> ({a.channel === "email" ? "إيميل" : "واتساب"}) · الهدف {formatEGP(a.targetPrice)}
                {best && <> · الحالي {formatEGP(best.price)}</>}
              </p>
            </div>
            {reached && <span className="chip bg-deal-500 text-white">وصل للسعر!</span>}
            <button type="button" aria-label="حذف" className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => remove(a.id)}><Trash2 className="size-4" /></button>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Import / export / reset ───────────────────────── */

function DataTab({ notify }: Notify) {
  const { catalog, update, reset } = useCatalog();
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "catalog.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(file: File) {
    try {
      const data = JSON.parse(await file.text()) as Catalog;
      if (!Array.isArray(data.products) || !Array.isArray(data.stores) || !Array.isArray(data.categories) || !Array.isArray(data.industries)) {
        throw new Error("bad shape");
      }
      await update(() => ({ ...data, version: catalog.version }));
      notify("تم استيراد البيانات");
    } catch {
      alert("الملف ده مش ملف catalog.json صالح.");
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="card p-4">
        <Download className="mb-2 size-6 text-brand-600" />
        <h3 className="font-black">تصدير JSON</h3>
        <p className="mb-3 mt-1 text-sm text-slate-500">
          نزّل الملف واستبدل بيه <span className="ltr">data/catalog.json</span> في المشروع، وبعدها اعمل push على GitHub — Vercel هينشر التعديلات للكل.
        </p>
        <button type="button" className="btn-primary w-full" onClick={exportJson}><Download className="size-4" /> تصدير</button>
      </div>
      <div className="card p-4">
        <Upload className="mb-2 size-6 text-brand-600" />
        <h3 className="font-black">استيراد JSON</h3>
        <p className="mb-3 mt-1 text-sm text-slate-500">ارفع ملف catalog.json عشان تكمل شغلك من جهاز تاني.</p>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        <button type="button" className="btn-ghost w-full" onClick={() => fileRef.current?.click()}><Upload className="size-4" /> اختار ملف</button>
      </div>
      <div className="card p-4">
        <AlertTriangle className="mb-2 size-6 text-amber-500" />
        <h3 className="font-black">رجوع للبيانات الأصلية</h3>
        <p className="mb-3 mt-1 text-sm text-slate-500">يمسح كل تعديلاتك في المتصفح ده ويرجع للبيانات التجريبية.</p>
        <button
          type="button"
          className="btn w-full bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400"
          onClick={async () => {
            if (!confirm("متأكد؟ كل التعديلات هتتمسح.")) return;
            await reset();
            notify("رجعت البيانات الأصلية");
          }}
        >
          <RotateCcw className="size-4" /> استرجاع
        </button>
      </div>
      <div className="card flex items-center gap-3 p-4 text-sm text-slate-500 sm:col-span-3">
        <Boxes className="size-5 shrink-0" />
        {catalog.industries.length} مجال · {catalog.categories.length} قسم · {catalog.stores.length} متجر · {catalog.products.length} منتج
      </div>
    </div>
  );
}
