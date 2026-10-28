import { cx } from "@/components/ui";

/**
 * Temporary logo direction: a rising sun behind an isometric packaging box.
 * Replace with the approved official logo when provided (keep the same component API).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cx("size-9", className)} aria-hidden>
      <g stroke="#DC5000" strokeWidth="2.2" strokeLinecap="round">
        <path d="M24 4.5v4.5M10.5 10.5l3.2 3.2M37.5 10.5l-3.2 3.2M4.5 22h4.3M39.2 22h4.3" />
      </g>
      <path d="M12.5 23a11.5 11.5 0 0 1 23 0z" fill="#DC5000" />
      <path d="M24 18.5 38.5 25.5 24 32.5 9.5 25.5z" fill="#FFEDD7" />
      <path d="M9.5 25.5 24 32.5v13L9.5 38.5z" fill="#C79A6B" />
      <path d="M38.5 25.5 24 32.5v13l14.5-7z" fill="#8A6440" />
    </svg>
  );
}

export function Logo({ locale, className }: { locale: "ar" | "en"; inverted?: boolean; className?: string }) {
  const primary = locale === "ar" ? "ضوء الشروق" : "SUNRISE LIGHT";
  const secondary = locale === "ar" ? "SUNRISE LIGHT" : "مصنع ضوء الشروق";
  return (
    <span className={cx("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-medium text-navy">{primary}</span>
        <span className="mt-1 text-[10px] font-medium tracking-[0.18em] text-navy/50">{secondary}</span>
      </span>
    </span>
  );
}
