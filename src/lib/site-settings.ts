/**
 * Company settings stored as website-content keys (admin → Company settings).
 * Shared by the admin form and the public pages; empty values are simply not shown.
 */
export type SettingKind = "phone" | "email" | "url" | "text" | "id";

export interface SettingField {
  key: string;
  label: { ar: string; en: string };
  kind: SettingKind;
  /** true: separate Arabic and English values; false: one value used for both */
  bilingual?: boolean;
  placeholder?: string;
  hint?: { ar: string; en: string };
}

export const SETTING_GROUPS: { id: string; label: { ar: string; en: string }; fields: SettingField[] }[] = [
  {
    id: "contact",
    label: { ar: "بيانات التواصل", en: "Contact details" },
    fields: [
      { key: "contact.phone", label: { ar: "رقم الهاتف", en: "Phone" }, kind: "phone", placeholder: "+966 5x xxx xxxx" },
      { key: "contact.phone2", label: { ar: "رقم هاتف إضافي", en: "Second phone" }, kind: "phone", placeholder: "+966 5x xxx xxxx" },
      { key: "contact.whatsapp", label: { ar: "رقم واتساب", en: "WhatsApp number" }, kind: "phone", placeholder: "+9665xxxxxxxx", hint: { ar: "بالصيغة الدولية — يظهر زر واتساب عائم في الموقع", en: "International format — shows a floating WhatsApp button on the site" } },
      { key: "contact.email", label: { ar: "البريد الإلكتروني", en: "Email" }, kind: "email", placeholder: "info@example.com" },
      { key: "contact.email2", label: { ar: "بريد المبيعات", en: "Sales email" }, kind: "email", placeholder: "sales@example.com" },
      { key: "contact.address", label: { ar: "العنوان", en: "Address" }, kind: "text", bilingual: true },
      { key: "contact.hours", label: { ar: "ساعات العمل", en: "Working hours" }, kind: "text", bilingual: true },
      { key: "contact.map", label: { ar: "رابط الموقع على الخريطة", en: "Map link" }, kind: "url", placeholder: "https://maps.google.com/…" },
    ],
  },
  {
    id: "company",
    label: { ar: "البيانات النظامية", en: "Legal details" },
    fields: [
      { key: "company.cr", label: { ar: "رقم السجل التجاري", en: "Commercial registration" }, kind: "id", hint: { ar: "يظهر في عروض الأسعار", en: "Shown on quotations" } },
      { key: "company.vat", label: { ar: "الرقم الضريبي", en: "VAT number" }, kind: "id", hint: { ar: "يظهر في عروض الأسعار", en: "Shown on quotations" } },
    ],
  },
  {
    id: "social",
    label: { ar: "حسابات التواصل الاجتماعي", en: "Social accounts" },
    fields: [
      { key: "social.instagram", label: { ar: "إنستغرام", en: "Instagram" }, kind: "url", placeholder: "https://instagram.com/…" },
      { key: "social.x", label: { ar: "إكس (تويتر)", en: "X (Twitter)" }, kind: "url", placeholder: "https://x.com/…" },
      { key: "social.tiktok", label: { ar: "تيك توك", en: "TikTok" }, kind: "url", placeholder: "https://tiktok.com/@…" },
      { key: "social.snapchat", label: { ar: "سناب شات", en: "Snapchat" }, kind: "url", placeholder: "https://snapchat.com/add/…" },
      { key: "social.linkedin", label: { ar: "لينكدإن", en: "LinkedIn" }, kind: "url", placeholder: "https://linkedin.com/company/…" },
      { key: "social.facebook", label: { ar: "فيسبوك", en: "Facebook" }, kind: "url", placeholder: "https://facebook.com/…" },
    ],
  },
];

/** Page texts always offered in Admin → Website content, even before they exist in the database. */
export const PAGE_TEXT_KEYS = ["about.body", "services.body", "privacy.body", "terms.body"];

export const SETTING_KEYS = SETTING_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
export const isSettingKey = (key: string) => SETTING_KEYS.includes(key);

/** Returns an error code for an invalid value, or null. Empty is always allowed. */
export function validateSetting(kind: SettingKind, value: string): "phone" | "email" | "url" | null {
  const v = value.trim();
  if (!v) return null;
  if (kind === "phone" && !/^\+?[\d\s()-]{6,20}$/.test(v)) return "phone";
  if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "email";
  if (kind === "url" && !/^https:\/\/[^\s]+$/.test(v)) return "url";
  return null;
}

/** Only https links are ever rendered. */
export const safeUrl = (v: string) => (/^https:\/\/[^\s"<>]+$/.test(v.trim()) ? v.trim() : null);
export const whatsappUrl = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
};
export const telUrl = (v: string) => (v.replace(/[^\d+]/g, "").length >= 6 ? `tel:${v.replace(/[^\d+]/g, "")}` : null);

export interface SiteInfo {
  phone: string;
  phone2: string;
  email2: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  map: string | null;
  cr: string;
  vat: string;
  social: { key: string; label: string; url: string }[];
}

export function buildSiteInfo(get: (key: string) => string, locale: "ar" | "en"): SiteInfo {
  const social = (SETTING_GROUPS.find((g) => g.id === "social")?.fields ?? []).flatMap((f) => {
    const url = safeUrl(get(f.key));
    return url ? [{ key: f.key.slice(7), label: f.label[locale], url }] : [];
  });
  return {
    phone: get("contact.phone").trim(),
    phone2: get("contact.phone2").trim(),
    email2: get("contact.email2").trim(),
    whatsapp: get("contact.whatsapp").trim(),
    email: get("contact.email").trim(),
    address: get("contact.address").trim(),
    hours: get("contact.hours").trim(),
    map: safeUrl(get("contact.map")),
    cr: get("company.cr").trim(),
    vat: get("company.vat").trim(),
    social,
  };
}
