import type { MetadataRoute } from "next";

/** Web App Manifest — lets visitors install "أرخص" on their phone like a native app (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "أرخص — قارن الأسعار في مصر",
    short_name: "أرخص",
    description: "قارن أسعار الموبايلات واللابتوبات والسماعات والألعاب في مصر واشتري بالأرخص.",
    lang: "ar",
    dir: "rtl",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    categories: ["shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "أقوى العروض", url: "/search?sort=discount", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "كل المنتجات", url: "/search", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
