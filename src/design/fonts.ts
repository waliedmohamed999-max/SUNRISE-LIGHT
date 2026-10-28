import { Amiri, Cairo, IBM_Plex_Sans_Arabic, Inter, Tajawal } from "next/font/google";
import type { FontKey } from "./document";

// All fonts are SIL Open Font License — permitted for commercial print use.
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "700"], display: "swap" });
const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "700"], display: "swap" });
const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "700"], display: "swap" });
const amiri = Amiri({ subsets: ["arabic", "latin"], weight: ["400", "700"], display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export const STUDIO_FONTS: Record<FontKey, { label: string; family: string }> = {
  plexArabic: { label: "IBM Plex Sans Arabic", family: plex.style.fontFamily },
  cairo: { label: "Cairo", family: cairo.style.fontFamily },
  tajawal: { label: "Tajawal", family: tajawal.style.fontFamily },
  amiri: { label: "Amiri", family: amiri.style.fontFamily },
  inter: { label: "Inter", family: inter.style.fontFamily },
};

/** Resolve once every studio font is ready, so canvas text renders with the right face. */
export async function ensureStudioFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(
    Object.values(STUDIO_FONTS).flatMap((f) => [document.fonts.load(`400 24px ${f.family}`, "أب Ab"), document.fonts.load(`700 24px ${f.family}`, "أب Ab")]),
  ).catch(() => undefined);
}
