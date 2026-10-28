import { Alexandria, Hanken_Grotesk, IBM_Plex_Sans_Arabic, Inter, Literata } from "next/font/google";

/*
 * Type system (all SIL Open Font License):
 *  display — Hanken Grotesk (Latin, geometric grotesque in the spirit of Halyard Display)
 *            + Alexandria (Arabic, geometric display) for headlines
 *  body    — Inter (Latin) + IBM Plex Sans Arabic
 *  serif   — Literata, for numerals, formulas and editorial accents
 */

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-hanken", display: "swap" });

export const alexandria = Alexandria({ subsets: ["arabic", "latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-alexandria", display: "swap" });

export const literata = Literata({ subsets: ["latin"], weight: ["200", "300", "400", "500"], style: ["normal", "italic"], variable: "--font-literata", display: "swap" });

export const fontVariables = [plexArabic.variable, inter.variable, hanken.variable, alexandria.variable, literata.variable].join(" ");
