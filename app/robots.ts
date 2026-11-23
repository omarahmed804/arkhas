/** /robots.txt — lets search engines crawl the site, keeps admin and outbound redirects out. */
import type { MetadataRoute } from "next";
import { SITE_URL } from "./sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/go", "/api"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
