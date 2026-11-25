"use client";

import { Mail, MessageCircle, Store } from "lucide-react";
import { useLang } from "./LangProvider";

export const CONTACT_EMAIL = "arkhas.eg@gmail.com";

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black">{title}</h1>
      <div className="card space-y-4 p-6 leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  );
}

const H = ({ children }: { children: React.ReactNode }) => <h2 className="pt-2 text-lg font-black text-slate-900 dark:text-white">{children}</h2>;

export function AboutContent() {
  const { lang } = useLang();
  if (lang === "en")
    return (
      <Page title="About Arkhas">
        <p>Arkhas is a free price-comparison website for Egypt. We collect prices for the same product from many stores — Amazon, noon, Jumia, 2B, Dream 2000 and more — and show them on one page, sorted from cheapest to most expensive.</p>
        <H>What we do</H>
        <ul className="list-disc space-y-1 ps-5">
          <li>Compare prices of phones, laptops, headphones, games, gaming gear and gift cards.</li>
          <li>Track price history so you can tell a real discount from a fake one.</li>
          <li>Update prices automatically and regularly.</li>
        </ul>
        <H>We don't sell anything</H>
        <p>Arkhas is not a store. You always buy directly from the store, and the final price, stock and delivery are the ones on the store's page.</p>
      </Page>
    );
  return (
    <Page title="من نحن">
      <p>"أرخص" موقع مجاني لمقارنة الأسعار في مصر. بنجمع سعر نفس المنتج من متاجر كتير — أمازون، نون، جوميا، 2B، دريم 2000 وغيرهم — ونعرضهم في صفحة واحدة مرتبين من الأرخص للأغلى.</p>
      <H>بنعمل إيه</H>
      <ul className="list-disc space-y-1 ps-5">
        <li>بنقارن أسعار الموبايلات واللابتوبات والسماعات والألعاب وإكسسوارات الجيمنج وكروت الشحن.</li>
        <li>بنتابع تاريخ السعر عشان تعرف الخصم الحقيقي من الوهمي.</li>
        <li>بنحدّث الأسعار بشكل أوتوماتيك ومنتظم.</li>
      </ul>
      <H>إحنا مش متجر</H>
      <p>"أرخص" مش بيبيع حاجة. الشراء دايمًا بيكون من المتجر نفسه، والسعر النهائي والتوفر والشحن هما اللي في صفحة المتجر.</p>
    </Page>
  );
}

export function ContactContent() {
  const { lang } = useLang();
  const en = lang === "en";
  const items = [
    { icon: Mail, t: en ? "Email" : "الإيميل", d: en ? "For any question, suggestion or wrong price." : "لأي سؤال أو اقتراح أو سعر غلط." },
    { icon: Store, t: en ? "Stores & partnerships" : "المتاجر والشراكات", d: en ? "Own a store? Email us to list your products or offer a promo code to our visitors." : "عندك متجر؟ ابعتلنا عشان نعرض منتجاتك أو تقدّم كود خصم لزوار الموقع." },
    { icon: MessageCircle, t: en ? "Reply time" : "وقت الرد", d: en ? "We usually reply within 1–2 days." : "بنرد عادةً خلال يوم أو يومين." },
  ];
  return (
    <Page title={en ? "Contact us" : "تواصل معنا"}>
      <a href={`mailto:${CONTACT_EMAIL}`} className="ltr block rounded-xl bg-brand-50 p-4 text-center text-lg font-black text-brand-700 dark:bg-brand-600/15 dark:text-brand-100">
        {CONTACT_EMAIL}
      </a>
      <div className="grid gap-3">
        {items.map(({ icon: Icon, t, d }) => (
          <div key={t} className="flex gap-3">
            <Icon className="mt-1 size-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-black text-slate-900 dark:text-white">{t}</p>
              <p className="text-sm">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

export function PrivacyContent() {
  const { lang } = useLang();
  if (lang === "en")
    return (
      <Page title="Privacy policy">
        <p className="text-sm text-slate-500">Last updated: November 2026</p>
        <H>What we collect</H>
        <p>You can use Arkhas without an account. We don't ask for your name, phone or address to browse or compare prices.</p>
        <p>If you set a price alert, we only keep the email you enter, and only to send you that alert.</p>
        <H>Cookies and local storage</H>
        <p>We save small settings in your browser (language, dark mode, dismissed banners). When you click a store link, the store may set its own cookies. Those follow the store's own privacy policy.</p>
        <H>Sharing</H>
        <p>We never sell your data.</p>
        <H>Contact</H>
        <p>Questions? Email <a className="ltr font-bold text-brand-600" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </Page>
    );
  return (
    <Page title="سياسة الخصوصية">
      <p className="text-sm text-slate-500">آخر تحديث: نوفمبر 2026</p>
      <H>بنجمع إيه</H>
      <p>تقدر تستخدم "أرخص" من غير حساب. مش بنطلب اسمك أو رقمك أو عنوانك عشان تتصفح أو تقارن الأسعار.</p>
      <p>لو فعّلت تنبيه سعر، بنحتفظ بس بالإيميل اللي كتبته، وبنستخدمه بس عشان نبعتلك التنبيه.</p>
      <H>الكوكيز والتخزين في المتصفح</H>
      <p>بنحفظ إعدادات صغيرة في المتصفح بتاعك (اللغة، الوضع الداكن، البانرات اللي قفلتها). ولما تدوس على لينك متجر، المتجر ممكن يحط كوكيز خاصة بيه، ودي بتمشي على سياسة خصوصية المتجر نفسه.</p>
      <H>مشاركة البيانات</H>
      <p>عمرنا ما بنبيع بياناتك.</p>
      <H>تواصل</H>
      <p>عندك سؤال؟ ابعت على <a className="ltr font-bold text-brand-600" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </Page>
  );
}
