import "server-only";
import { cache } from "react";
import { db } from "./db";
import type { Locale } from "@/i18n/config";
import { buildSiteInfo } from "./site-settings";

/** Editable website content (admin → Website content). Empty values render as placeholders. */
export const getContent = cache(async (locale: Locale) => {
  const rows = await db.websiteContent.findMany();
  const map = new Map(rows.map((r) => [r.key, locale === "ar" ? r.valueAr : r.valueEn]));
  return (key: string) => map.get(key) ?? "";
});

export const siteUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** Structured company details (contact, legal, social) for the given language. */
export const getSiteInfo = cache(async (locale: Locale) => buildSiteInfo(await getContent(locale), locale));
