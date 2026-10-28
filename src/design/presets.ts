import { nanoid } from "nanoid";
import type { Coating, DesignElement, FontKey, SurfaceDoc, TextElement } from "./document";
import type { IconKey } from "./icons";
import type { SurfaceKey, SurfaceSpec } from "@/packaging/types";

/**
 * One-click starting designs, built for the current template's real face sizes.
 * Uploaded logos (image elements) are kept and moved to the top of each face's layer stack.
 */
type Measure = (el: Pick<TextElement, "text" | "font" | "bold" | "fontSizeMm">) => { width: number; height: number };
interface Ctx {
  specs: SurfaceSpec[];
  brand: string;
  tagline: string;
  font: FontKey;
  measure: Measure;
}
type Face = { background: string | null; coating?: Coating; elements: DesignElement[] };

function text(c: Ctx, spec: SurfaceSpec, value: string, sizeFrac: number, color: string, yFrac: number, finish?: DesignElement["finish"], bold = true): TextElement {
  let fontSizeMm = Math.max(3, Math.min(spec.h * sizeFrac, spec.w * 0.16));
  let m = c.measure({ text: value, font: c.font, bold, fontSizeMm });
  if (m.width > spec.w * 0.84) {
    fontSizeMm *= (spec.w * 0.84) / m.width;
    m = c.measure({ text: value, font: c.font, bold, fontSizeMm });
  }
  return { id: nanoid(10), type: "text", text: value, font: c.font, bold, fontSizeMm, color, align: "center", x: spec.w / 2, y: spec.h * yFrac, width: m.width, height: m.height, rotation: 0, ...(finish ? { finish } : {}) };
}

function icon(spec: SurfaceSpec, key: IconKey, color: string, xFrac: number, yFrac: number, sizeFrac: number, finish?: DesignElement["finish"]): DesignElement {
  const side = Math.min(spec.w, spec.h) * sizeFrac;
  return { id: nanoid(10), type: "icon", icon: key, color, x: spec.w * xFrac, y: spec.h * yFrac, width: side, height: side, rotation: 0, ...(finish ? { finish } : {}) };
}

function band(spec: SurfaceSpec, color: string, yFrac: number, hFrac: number): DesignElement {
  return { id: nanoid(10), type: "icon", icon: "shape-rect", color, x: spec.w / 2, y: spec.h * yFrac, width: spec.w, height: spec.h * hFrac, rotation: 0 };
}

function frame(spec: SurfaceSpec, color: string, finish?: DesignElement["finish"]): DesignElement {
  const inset = Math.min(spec.w, spec.h) * 0.08;
  return { id: nanoid(10), type: "icon", icon: "shape-frame", color, x: spec.w / 2, y: spec.h / 2, width: spec.w - inset * 2, height: spec.h - inset * 2, rotation: 0, ...(finish ? { finish } : {}) };
}

const isMain = (k: SurfaceKey) => k === "front" || k === "back" || k === "top";
const isSide = (k: SurfaceKey) => k === "left" || k === "right";

export interface DesignPreset {
  key: string;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  swatches: string[];
  build: (c: Ctx, spec: SurfaceSpec) => Face;
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    key: "kraft-minimal",
    ar: "كرافت بسيط",
    en: "Kraft minimal",
    descAr: "لون الكرتون الطبيعي، اسمك بالكحلي، وعلامات بيئية على الجانب.",
    descEn: "Natural board, your name in navy, eco marks on the side.",
    swatches: ["#C49A68", "#2F357C"],
    build: (c, s) => ({
      background: null,
      elements: isMain(s.key) ? [text(c, s, c.brand, 0.2, "#2F357C", 0.5)] : isSide(s.key) ? [icon(s, "recyclable", "#2F357C", 0.35, 0.75, 0.22), icon(s, "eco", "#2F357C", 0.65, 0.75, 0.22)] : [],
    }),
  },
  {
    key: "brand-bold",
    ar: "هوية جريئة",
    en: "Bold brand",
    descAr: "برتقالي الهوية على الوجه، كحلي على الغطاء والجوانب، سطح مطفي.",
    descEn: "Brand orange front, navy lid and sides, matte finish.",
    swatches: ["#EA5B32", "#2F357C", "#FFFFFF"],
    build: (c, s) => ({
      background: s.key === "front" || s.key === "back" ? "#EA5B32" : "#2F357C",
      coating: "matte",
      elements: isMain(s.key) ? [text(c, s, c.brand, 0.22, "#FFFFFF", 0.46), text(c, s, c.tagline, 0.08, "#FFFFFF", 0.66, undefined, false)] : [],
    }),
  },
  {
    key: "luxury-gold",
    ar: "فاخر ببصمة ذهبي",
    en: "Luxury gold foil",
    descAr: "أسود ناعم الملمس مع اسمك وإطار ببصمة ذهبي — مثالي للعطور والهدايا.",
    descEn: "Soft-touch black with gold-foil name and frame — ideal for perfume and gifts.",
    swatches: ["#1B1714", "#D4A84B"],
    build: (c, s) => ({
      background: "#1B1714",
      coating: "soft-touch",
      elements: isMain(s.key) ? [frame(s, "#D4A84B", "foil-gold"), text(c, s, c.brand, 0.18, "#D4A84B", 0.5, "foil-gold")] : [],
    }),
  },
  {
    key: "clean-white",
    ar: "أبيض أنيق",
    en: "Clean white",
    descAr: "أبيض لامع، اسم كحلي وخط برتقالي رفيع — مناسب للتجميل والأدوية.",
    descEn: "Gloss white, navy name and a thin orange rule — suits cosmetics and pharma.",
    swatches: ["#FFFFFF", "#2F357C", "#EA5B32"],
    build: (c, s) => ({
      background: "#FFFFFF",
      coating: "gloss",
      elements: isMain(s.key)
        ? [text(c, s, c.brand, 0.18, "#2F357C", 0.45), { ...band(s, "#EA5B32", 0.62, 0.025), width: s.w * 0.3, x: s.w / 2 }]
        : isSide(s.key)
          ? [text(c, s, c.tagline, 0.07, "#2F357C", 0.5, undefined, false)]
          : [],
    }),
  },
  {
    key: "fresh-food",
    ar: "أطعمة طازجة",
    en: "Fresh food",
    descAr: "كريمي دافئ وشريط برتقالي وعلامة آمن للأغذية — للمطاعم والمخابز.",
    descEn: "Warm cream, orange band and a food-safe mark — for restaurants and bakeries.",
    swatches: ["#FDF3E7", "#EA5B32", "#2F357C"],
    build: (c, s) => ({
      background: "#FDF3E7",
      coating: "matte",
      elements: isMain(s.key)
        ? [band(s, "#EA5B32", 0.86, 0.16), text(c, s, c.brand, 0.2, "#2F357C", 0.42)]
        : isSide(s.key)
          ? [icon(s, "food-safe", "#EA5B32", 0.5, 0.45, 0.3)]
          : [],
    }),
  },
  {
    key: "shipping-pro",
    ar: "شحن احترافي",
    en: "Shipping pro",
    descAr: "كرافت مع اسمك بالأسود وعلامات المناولة الدولية على الجوانب.",
    descEn: "Kraft with your name in black and international handling marks on the sides.",
    swatches: ["#C49A68", "#1D2235"],
    build: (c, s) => ({
      background: null,
      elements: isMain(s.key)
        ? [text(c, s, c.brand, 0.2, "#1D2235", 0.5)]
        : isSide(s.key)
          ? [icon(s, "this-way-up", "#1D2235", 0.22, 0.3, 0.24), icon(s, "fragile", "#1D2235", 0.5, 0.3, 0.24), icon(s, "keep-dry", "#1D2235", 0.78, 0.3, 0.24)]
          : [],
    }),
  },
  {
    key: "eco-green",
    ar: "أخضر صديق للبيئة",
    en: "Eco green",
    descAr: "أخضر غامق مع اسم أبيض وعلامات التدوير.",
    descEn: "Deep green with a white name and recycling marks.",
    swatches: ["#2F5D46", "#FFFFFF"],
    build: (c, s) => ({
      background: "#2F5D46",
      coating: "matte",
      elements: isMain(s.key) ? [text(c, s, c.brand, 0.2, "#FFFFFF", 0.46), icon(s, "eco", "#FFFFFF", 0.5, 0.72, 0.14)] : isSide(s.key) ? [icon(s, "recyclable", "#FFFFFF", 0.5, 0.5, 0.3)] : [],
    }),
  },
];

/** Apply a preset to every face; keeps the customer's uploaded logos on top. */
export function applyPreset(preset: DesignPreset, current: Record<SurfaceKey, SurfaceDoc>, c: Ctx, printable: (k: SurfaceKey) => boolean): Record<SurfaceKey, SurfaceDoc> {
  const out = { ...current };
  for (const spec of c.specs) {
    if (!printable(spec.key)) continue;
    const face = preset.build(c, spec);
    const logos = current[spec.key].elements.filter((e) => e.type === "image");
    out[spec.key] = { background: face.background, coating: face.coating ?? "none", elements: [...face.elements, ...logos] };
  }
  return out;
}
