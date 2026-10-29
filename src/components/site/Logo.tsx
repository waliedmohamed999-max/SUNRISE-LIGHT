import Image from "next/image";
import { cx } from "@/components/ui";

/*
 * Official Sunrise Light logo (source: brand/logo-original.png).
 * Web variants in /public/brand are derived from it (scratchpad script logo.mjs):
 *   logo.png       — original colours, for light backgrounds (documents, print)
 *   logo-dark.png  — navy lettering in cream, for the dark site
 *   mark.png       — the orange "S" mark alone
 */
const FULL = { w: 1355, h: 511 };
const MARK = { w: 400, h: 539 };

export function LogoMark({ className }: { className?: string }) {
  return <Image src="/brand/mark.png" alt="" width={MARK.w} height={MARK.h} className={cx("h-10 w-auto self-start", className)} priority />;
}

export function Logo({ locale, variant = "dark", className }: { locale: "ar" | "en"; variant?: "dark" | "light"; className?: string }) {
  return (
    <Image
      src={variant === "light" ? "/brand/logo.png" : "/brand/logo-dark.png"}
      alt={locale === "ar" ? "مصنع ضوء الشروق للكرتون والتغليف — Sunrise Light" : "Sunrise Light Packaging Factory — مصنع ضوء الشروق"}
      width={FULL.w}
      height={FULL.h}
      className={cx("h-11 w-auto", className)}
      priority
    />
  );
}
