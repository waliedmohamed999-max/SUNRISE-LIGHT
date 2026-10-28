/**
 * The factory's service lines, as listed in the official company profile ("خدماتنا / Our services").
 * Images are the profile's own illustrations (product mock-ups carrying the Sunrise Light logo).
 */
export interface FactoryService {
  slug: string;
  name: { ar: string; en: string };
  image: string;
  /** studio category that designs this kind of product, if any */
  studioCategory?: string;
}

export const FACTORY_SERVICES: FactoryService[] = [
  { slug: "invercote-boxes", name: { ar: "كرتون إنفركوت", en: "Invercote boxes" }, image: "/services/invercote-boxes.webp", studioCategory: "folding-cartons" },
  { slug: "corrugated-boxes", name: { ar: "كرتون مضلّع", en: "Corrugated boxes" }, image: "/services/corrugated-boxes.webp", studioCategory: "shipping-boxes" },
  { slug: "kraft-boxes", name: { ar: "كرتون كرافت", en: "Kraft boxes" }, image: "/services/kraft-boxes.webp", studioCategory: "food-packaging" },
  { slug: "merge-boxes", name: { ar: "كرتون دمج", en: "Merge boxes" }, image: "/services/merge-boxes.webp", studioCategory: "mailer-boxes" },
  { slug: "hard-cover-boxes", name: { ar: "كرتون هارد كفر", en: "Hard-cover boxes" }, image: "/services/hard-cover-boxes.webp", studioCategory: "gift-boxes" },
  { slug: "kraft-bags", name: { ar: "أكياس كرافت", en: "Kraft bags" }, image: "/services/kraft-bags.webp", studioCategory: "paper-bags" },
  { slug: "invercote-bags", name: { ar: "أكياس إنفركوت", en: "Invercote bags" }, image: "/services/invercote-bags.webp", studioCategory: "paper-bags" },
  { slug: "sticker-rolls", name: { ar: "استيكر رول", en: "Sticker rolls" }, image: "/services/sticker-rolls.webp" },
  { slug: "sticker-sheets", name: { ar: "استيكر شيت", en: "Sticker sheets" }, image: "/services/sticker-sheets.webp" },
  { slug: "wrapping-paper", name: { ar: "ورق لف", en: "Wrapping paper" }, image: "/services/wrapping-paper.webp" },
];
