import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  const production = process.env.APP_ENV === "production";
  return {
    // Staging and development must never be indexed
    rules: production ? [{ userAgent: "*", allow: "/", disallow: ["/api/", "/*/admin", "/*/account", "/*/quotation/"] }] : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
