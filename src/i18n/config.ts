export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export const isLocale = (v: string | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);
export const dirOf = (l: Locale) => (l === "ar" ? "rtl" : "ltr");

/** Pick the Arabic or English variant of a bilingual record field. */
export function pick<T extends Record<string, unknown>>(obj: T, base: string, locale: Locale): string {
  const key = `${base}${locale === "ar" ? "Ar" : "En"}`;
  return (obj[key] as string) ?? "";
}
