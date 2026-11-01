"use client";

import { cx } from "@/components/ui";

/** Backdrop choices for the 3D view. */
export const BACKDROPS = [
  { color: "#050505", ar: "أسود", en: "Black" },
  { color: "#f1f2f7", ar: "فاتح", en: "Light" },
  { color: "#ffffff", ar: "أبيض", en: "White" },
  { color: "#1D2A44", ar: "كحلي", en: "Navy" },
  { color: "#d9c28e", ar: "دهبي", en: "Gold" },
];

export function BackdropPicker({ value, onChange, locale }: { value: string; onChange: (color: string) => void; locale: string }) {
  return (
    <span className="flex items-center gap-1 px-1" role="group" aria-label={locale === "ar" ? "الخلفية" : "Backdrop"}>
      {BACKDROPS.map((b) => (
        <button
          key={b.color}
          type="button"
          title={locale === "ar" ? b.ar : b.en}
          aria-label={locale === "ar" ? b.ar : b.en}
          aria-pressed={value === b.color}
          onClick={() => onChange(b.color)}
          className={cx("size-5 rounded-full border", value === b.color ? "border-[#E2BC6B] ring-2 ring-[#E2BC6B]/60" : "border-black/20")}
          style={{ background: b.color }}
        />
      ))}
    </span>
  );
}
