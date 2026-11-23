/** Builds the CTA (label + href) for an offer based on its link type. */
import { tr } from "./i18n";
import { formatEGP } from "./format";
import type { Offer, OfferLinkType, Product } from "./types";

export const LINK_TYPE_LABELS: Record<OfferLinkType, string> = {
  website: "اذهب للمتجر",
  whatsapp: "اطلب واتساب",
  social: "تواصل مع الصفحة",
};

/** Admin dropdown labels. */
export const LINK_TYPE_OPTIONS: { value: OfferLinkType; label: string }[] = [
  { value: "website", label: "موقع إلكتروني" },
  { value: "whatsapp", label: "واتساب" },
  { value: "social", label: "فيسبوك / إنستجرام" },
];

/** Edit this template to change the prefilled WhatsApp message. */
export function whatsappMessage(productName: string, price: number) {
  return `السلام عليكم، أنا جاي من موقع أرخص (Arkhas) وعايز أطلب ${productName} بسعر ${formatEGP(price)}`;
}

/**
 * Normalizes Egyptian numbers for wa.me (international format, digits only):
 * "010 1234 5678" → "201012345678", "+20 10…" → "2010…".
 */
export function normalizeWhatsapp(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = `2${d}`; // local Egyptian mobile 01xxxxxxxxx
  return d;
}

export function isValidWhatsapp(raw: string) {
  return /^\d{10,15}$/.test(normalizeWhatsapp(raw));
}

export interface OfferCta {
  label: string;
  href: string | null; // null → misconfigured, render disabled
  type: OfferLinkType;
}

export function offerCta(offer: Offer, product: Product): OfferCta {
  const type = offer.linkType ?? "website"; // older saved data had no linkType
  if (type === "whatsapp") {
    const num = offer.whatsappNumber ? normalizeWhatsapp(offer.whatsappNumber) : "";
    const text = encodeURIComponent(whatsappMessage(product.name, offer.price));
    return { type, label: LINK_TYPE_LABELS.whatsapp, href: num ? `https://wa.me/${num}?text=${text}` : null };
  }
  return { type, label: tr(LINK_TYPE_LABELS[type]), href: offer.url || null };
}
