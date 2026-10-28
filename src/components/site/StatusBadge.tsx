import type { QuotationStatus } from "@prisma/client";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Badge } from "@/components/ui";

const TONE: Record<QuotationStatus, "neutral" | "sun" | "ok" | "warn" | "danger" | "navy"> = {
  NEW: "sun",
  TECHNICAL_REVIEW: "navy",
  PRICING: "navy",
  QUOTE_SENT: "ok",
  REVISION_REQUESTED: "warn",
  APPROVED: "ok",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export function StatusBadge({ status, locale }: { status: QuotationStatus; locale: Locale }) {
  return <Badge tone={TONE[status]}>{getDict(locale).status[status]}</Badge>;
}

// Arabic output carries right-to-left marks between the digits; dates are shown in LTR-isolated .num spans, where those marks scramble the order
export const fmtDate = (d: Date, locale: Locale, withTime = false) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}) }).format(d).replace(/\u200f/g, "");

export const fmtMoney = (v: { toString(): string } | number, currency: string, locale: Locale) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(v.toString()));
