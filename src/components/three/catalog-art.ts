"use client";

import { brandLogo, grainFill, sunMark, surfaceCanvases } from "./showcase";
import type { Dimensions, SurfaceKey } from "@/packaging/types";

export interface CatalogArtInput {
  engineKey: string;
  boxStyle: string;
  defaults: Dimensions;
  materials: { color: string }[];
  displayColor?: string;
}

const luminance = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/**
 * Catalogue artwork: the template at its default size in its display material, printed with the official
 * Sunrise Light logo (front, back and lid) and the mark on the sides. Call after brandMarkReady().
 */
export function catalogCanvases(p: CatalogArtInput): Record<SurfaceKey, HTMLCanvasElement> {
  const base = p.displayColor ?? p.materials[0]?.color ?? "#C9A06B";
  const dark = luminance(base) < 0.35;
  return surfaceCanvases(p.defaults, p.engineKey, (key, ctx, w, h) => {
    grainFill(ctx, w, h, base, dark ? 8 : 14);
    // wrapping paper (large sheets) is printed as an all-over pattern of the mark
    if (p.engineKey === "sheet" && p.defaults.length >= 250) {
      const step = Math.min(w, h) / 5;
      for (let row = 0, y = step / 2; y < h + step; row++, y += step * 0.866)
        for (let x = row % 2 ? step : step / 2; x < w + step; x += step) sunMark(ctx, x, y, step * 0.16, dark ? "#FFEDD7" : "#EA5B32");
      return;
    }
    if (key === "front" || key === "back" || (key === "top" && p.boxStyle !== "bag")) {
      // a cup wrap spans the whole circumference: keep the logo small and turned ~38° towards the catalogue camera
      brandLogo(ctx, p.boxStyle === "cup" ? w * 0.605 : w / 2, h / 2, Math.min(w * (p.boxStyle === "cup" ? 0.3 : 0.62), h * 1.6), dark ? "dark" : "light");
    } else if (key === "left" || key === "right") {
      sunMark(ctx, w / 2, h * 0.5, Math.min(w, h) * 0.12, dark ? "#FFEDD7" : "#EA5B32");
    }
  });
}
