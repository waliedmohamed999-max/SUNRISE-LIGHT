import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/content";

export const dynamic = "force-dynamic";

const STATIC = ["", "/products", "/studio", "/services", "/portfolio", "/about", "/contact", "/faq", "/quote", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const categories = await db.packagingCategory.findMany({ where: { status: { not: "HIDDEN" } }, select: { slug: true } }).catch(() => []);
  const paths = [...STATIC, ...categories.map((c) => `/products/${c.slug}`)];
  return paths.map((p) => ({
    url: `${base}/ar${p}`,
    alternates: { languages: { ar: `${base}/ar${p}`, en: `${base}/en${p}` } },
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
}
