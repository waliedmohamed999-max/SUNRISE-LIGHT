/** Industry tags used to browse the template catalogue. */
export const INDUSTRIES = [
  { key: "restaurants", ar: "المطاعم والوجبات", en: "Restaurants & takeaway" },
  { key: "bakery", ar: "المخابز والحلويات", en: "Bakery & desserts" },
  { key: "coffee", ar: "القهوة والشاي", en: "Coffee & tea" },
  { key: "dates", ar: "التمور والحلويات الشرقية", en: "Dates & Arabic sweets" },
  { key: "perfumes", ar: "العطور", en: "Perfumes" },
  { key: "oud", ar: "العود والبخور", en: "Oud & bakhoor" },
  { key: "cosmetics", ar: "مستحضرات التجميل والعناية", en: "Cosmetics & care" },
  { key: "gifts", ar: "الهدايا والمناسبات", en: "Gifts & occasions" },
  { key: "jewelry", ar: "المجوهرات والإكسسوارات", en: "Jewellery & accessories" },
  { key: "fashion", ar: "الأزياء والأحذية", en: "Fashion & footwear" },
  { key: "electronics", ar: "الإلكترونيات", en: "Electronics" },
  { key: "pharma", ar: "الأدوية والمكمّلات", en: "Pharma & supplements" },
  { key: "ecommerce", ar: "التجارة الإلكترونية", en: "E-commerce" },
  { key: "retail", ar: "التجزئة والسوبرماركت", en: "Retail & grocery" },
  { key: "logistics", ar: "الشحن والتخزين", en: "Shipping & storage" },
] as const;

export type IndustryKey = (typeof INDUSTRIES)[number]["key"];

export const industryLabel = (key: string, locale: "ar" | "en") => {
  const i = INDUSTRIES.find((x) => x.key === key);
  return i ? (locale === "ar" ? i.ar : i.en) : key;
};
