"use client";

/** Full add/edit form for a product, its specs and its store offers. */
import { Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useCatalog } from "../CatalogProvider";
import { slugify, uid } from "@/lib/format";
import { isValidWhatsapp, LINK_TYPE_OPTIONS } from "@/lib/offer-link";
import { withTodayHistory } from "@/lib/pricing";
import type { Offer, OfferLinkType, Product } from "@/lib/types";

function emptyProduct(categoryId: string): Product {
  return {
    id: uid("p"),
    slug: "",
    name: "",
    nameAr: "",
    brand: "",
    categoryId,
    images: [],
    specs: [{ label: "", value: "" }],
    description: "",
    popularity: 50,
    offers: [],
    priceHistory: [],
    createdAt: new Date().toISOString(),
  };
}

export function ProductEditor({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { catalog, update } = useCatalog();
  const isNew = !product;
  const [draft, setDraft] = useState<Product>(() => (product ? structuredClone(product) : emptyProduct(catalog.categories[0]?.id ?? "")));
  const [imagesText, setImagesText] = useState(draft.images.join("\n"));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<string[]>([]);

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setOffer = (i: number, patch: Partial<Offer>) =>
    setDraft((d) => ({ ...d, offers: d.offers.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));

  const unusedStores = useMemo(
    () => catalog.stores.filter((s) => !draft.offers.some((o) => o.storeId === s.id)),
    [catalog.stores, draft.offers],
  );

  function addOffer() {
    const store = unusedStores[0];
    if (!store) return;
    setDraft((d) => ({
      ...d,
      offers: [
        ...d.offers,
        { storeId: store.id, price: 0, linkType: "website", url: store.url, inStock: true, freeShipping: false, deliveryEta: "2–3 أيام", updatedAt: new Date().toISOString() },
      ],
    }));
  }

  function validate(p: Product): string[] {
    const e: string[] = [];
    if (!p.name.trim()) e.push("اسم المنتج مطلوب.");
    if (!p.slug.trim()) e.push("الرابط (slug) مطلوب.");
    if (catalog.products.some((x) => x.slug === p.slug && x.id !== p.id)) e.push("الرابط (slug) مستخدم لمنتج تاني.");
    if (!p.categoryId) e.push("اختار القسم.");
    p.offers.forEach((o, i) => {
      const name = catalog.stores.find((s) => s.id === o.storeId)?.name ?? `#${i + 1}`;
      if (!(o.price > 0)) e.push(`سعر ${name} لازم يكون أكبر من صفر.`);
      if (o.linkType === "whatsapp" && !isValidWhatsapp(o.whatsappNumber ?? "")) e.push(`رقم واتساب ${name} غير صحيح.`);
      if (o.linkType !== "whatsapp" && !/^https?:\/\//.test(o.url)) e.push(`رابط ${name} لازم يبدأ بـ https://`);
    });
    return e;
  }

  async function save() {
    const now = new Date().toISOString();
    const original = new Map(product?.offers.map((o) => [o.storeId, o]));
    let next: Product = {
      ...draft,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      images: imagesText.split("\n").map((s) => s.trim()).filter(Boolean),
      specs: draft.specs.filter((s) => s.label.trim() && s.value.trim()),
      // Bump "last updated" only for offers whose data changed
      offers: draft.offers.map((o) => {
        const before = original.get(o.storeId);
        if (before && JSON.stringify({ ...before, updatedAt: "" }) === JSON.stringify({ ...o, updatedAt: "" })) return o;
        const { needsCheck: _n, ...rest } = o; // edited by you = confirmed
        return { ...rest, updatedAt: now };
      }),
    };
    const errs = validate(next);
    setErrors(errs);
    if (errs.length) return;
    next = withTodayHistory(next);
    await update((c) => ({
      ...c,
      products: isNew ? [next, ...c.products] : c.products.map((p) => (p.id === next.id ? next : p)),
    }));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="محرر المنتج">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-slate-50 shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-black">{isNew ? "إضافة منتج جديد" : "تعديل المنتج"}</h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {/* Basics */}
          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">اسم المنتج (إنجليزي تقني)</label>
              <input
                className="input ltr text-start"
                value={draft.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
                placeholder="Sony PS5 DualSense Controller – White"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">الاسم بالعربي (اختياري)</label>
              <input className="input" value={draft.nameAr ?? ""} onChange={(e) => set("nameAr", e.target.value)} />
            </div>
            <div>
              <label className="label">الماركة</label>
              <input className="input ltr text-start" value={draft.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Sony" />
            </div>
            <div>
              <label className="label">القسم</label>
              <select className="input" value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                {catalog.industries.map((ind) => (
                  <optgroup key={ind.id} label={ind.name}>
                    {catalog.categories
                      .filter((c) => c.industryId === ind.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="label">الرابط (slug)</label>
              <input
                className="input ltr text-start"
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </div>
            <div>
              <label className="label">الشعبية (0–100)</label>
              <input type="number" min={0} max={100} className="input" value={draft.popularity} onChange={(e) => set("popularity", Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">روابط الصور (رابط في كل سطر)</label>
              <textarea className="input ltr min-h-20 text-start" value={imagesText} onChange={(e) => setImagesText(e.target.value)} placeholder="https://..." />
              {/* Live preview so broken links are obvious before saving */}
              <div className="mt-2 flex flex-wrap gap-2">
                {imagesText.split("\n").map((u) => u.trim()).filter(Boolean).map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="size-16 rounded-lg bg-white object-contain p-1 ring-1 ring-slate-200 dark:ring-slate-700" onError={(e) => (e.currentTarget.style.outline = "2px solid #dc2626")} />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">الوصف (اختياري)</label>
              <textarea className="input min-h-20" value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </div>
          </section>

          {/* Specs */}
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-black">المواصفات <span className="text-xs font-medium text-slate-500">(أول 4 بيظهروا كملخص)</span></h3>
              <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => set("specs", [...draft.specs, { label: "", value: "" }])}>
                <Plus className="size-4" /> إضافة
              </button>
            </div>
            <div className="space-y-2">
              {draft.specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input" placeholder="مثلاً: الذاكرة" value={s.label} onChange={(e) => set("specs", draft.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="input ltr text-start" placeholder="8GB GDDR6" value={s.value} onChange={(e) => set("specs", draft.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button type="button" aria-label="حذف" className="shrink-0 rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => set("specs", draft.specs.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Offers */}
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-black">أسعار المتاجر</h3>
              <button type="button" className="btn-ghost px-3 py-1.5" onClick={addOffer} disabled={!unusedStores.length}>
                <Plus className="size-4" /> متجر
              </button>
            </div>
            {draft.offers.length === 0 && <p className="py-4 text-center text-sm text-slate-500">لسه مفيش متاجر. اضغط “متجر” لإضافة سعر.</p>}
            <div className="space-y-3">
              {draft.offers.map((o, i) => (
                <div key={o.storeId} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-6 dark:border-slate-800">
                  <div className="sm:col-span-2">
                    <label className="label">المتجر</label>
                    <select className="input" value={o.storeId} onChange={(e) => setOffer(i, { storeId: e.target.value })}>
                      {catalog.stores
                        .filter((s) => s.id === o.storeId || unusedStores.includes(s))
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">نوع الزرار</label>
                    <select className="input" value={o.linkType ?? "website"} onChange={(e) => setOffer(i, { linkType: e.target.value as OfferLinkType })}>
                      {LINK_TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    {o.linkType === "whatsapp" ? (
                      <>
                        <label className="label">رقم الواتساب</label>
                        <input className="input ltr text-start" inputMode="tel" placeholder="01012345678" value={o.whatsappNumber ?? ""} onChange={(e) => setOffer(i, { whatsappNumber: e.target.value })} />
                      </>
                    ) : (
                      <>
                        <label className="label">{o.linkType === "social" ? "رابط الصفحة / البوست" : "رابط المنتج"}</label>
                        <input className="input ltr text-start" placeholder="https://" value={o.url} onChange={(e) => setOffer(i, { url: e.target.value })} />
                      </>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">السعر (ج.م)</label>
                    <input type="number" className="input font-bold" value={o.price || ""} onChange={(e) => setOffer(i, { price: Number(e.target.value) })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">السعر قبل الخصم (اختياري)</label>
                    <input type="number" className="input" value={o.oldPrice ?? ""} onChange={(e) => setOffer(i, { oldPrice: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">مدة التوصيل</label>
                    <input className="input" value={o.deliveryEta} onChange={(e) => setOffer(i, { deliveryEta: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:col-span-6">
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" className="size-4 accent-deal-500" checked={o.inStock} onChange={(e) => setOffer(i, { inStock: e.target.checked })} /> متوفر
                    </label>
                    {(o.linkType ?? "website") === "website" && (
                      <label className="flex items-center gap-2 text-sm font-bold" title="السكربت الآلي هيراجع السعر من الرابط ده كل 6 ساعات">
                        <input type="checkbox" className="size-4 accent-brand-600" checked={o.autoTrack !== false} onChange={(e) => setOffer(i, { autoTrack: e.target.checked ? undefined : false })} /> متابعة آلية
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" className="size-4 accent-brand-600" checked={o.freeShipping} onChange={(e) => setOffer(i, { freeShipping: e.target.checked })} /> شحن مجاني
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" className="size-4 accent-brand-600" checked={!!o.installment} onChange={(e) => setOffer(i, { installment: e.target.checked || undefined })} /> تقسيط متاح
                    </label>
                    <button type="button" className="ms-auto flex items-center gap-1 text-sm font-bold text-red-500" onClick={() => set("offers", draft.offers.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4" /> حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {errors.length > 0 && (
            <ul className="mb-3 list-inside list-disc rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>إلغاء</button>
            <button type="button" className="btn-primary flex-1" onClick={save}>
              <Save className="size-4" /> حفظ المنتج
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
