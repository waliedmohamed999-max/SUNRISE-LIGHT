import { z } from "zod";
import { ICON_KEYS } from "./icons";
import { SURFACE_KEYS, type Dimensions, type SurfaceKey, type SurfaceSpec } from "@/packaging/types";

/**
 * Editable design document. Persisted as JSON (design_projects.document and design_versions).
 * Element geometry is in millimetres relative to the surface's top-left corner;
 * (x, y) is the element CENTRE and rotation is in degrees, clockwise.
 */

export const FONT_KEYS = ["plexArabic", "cairo", "tajawal", "amiri", "inter"] as const;
export type FontKey = (typeof FONT_KEYS)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const mm = z.number().finite();

export const FINISHES = ["none", "foil-gold", "foil-silver", "emboss", "deboss", "spot-uv"] as const;
export type Finish = (typeof FINISHES)[number];

export const FINISH_LABELS: Record<Finish, { ar: string; en: string }> = {
  none: { ar: "بدون", en: "None" },
  "foil-gold": { ar: "بصمة ذهبي", en: "Gold foil" },
  "foil-silver": { ar: "بصمة فضي", en: "Silver foil" },
  emboss: { ar: "كفراج بارز", en: "Emboss" },
  deboss: { ar: "كفراج غائر", en: "Deboss" },
  "spot-uv": { ar: "يو في موضعي", en: "Spot UV" },
};

const baseElement = z.object({
  id: z.string().min(1).max(40),
  /** Print finish applied to this element (foil = البصمة, emboss/deboss = الكفراج) */
  finish: z.enum(FINISHES).optional(),
  x: mm,
  y: mm,
  width: z.number().finite().positive().max(5000),
  height: z.number().finite().positive().max(5000),
  rotation: z.number().finite().min(-360).max(360),
  locked: z.boolean().optional(),
});

export const imageElementSchema = baseElement.extend({
  type: z.literal("image"),
  assetId: z.string().min(1).max(40),
  mime: z.enum(["image/png", "image/jpeg", "image/svg+xml"]),
  naturalWidth: z.number().int().positive(),
  naturalHeight: z.number().int().positive(),
});

export const textElementSchema = baseElement.extend({
  type: z.literal("text"),
  text: z.string().max(500),
  font: z.enum(FONT_KEYS),
  fontSizeMm: z.number().finite().positive().max(500),
  color: hex,
  bold: z.boolean(),
  align: z.enum(["start", "center", "end"]),
});

export const iconElementSchema = baseElement.extend({
  type: z.literal("icon"),
  icon: z.enum(ICON_KEYS),
  color: hex,
});

export const elementSchema = z.discriminatedUnion("type", [imageElementSchema, textElementSchema, iconElementSchema]);
export type DesignElement = z.infer<typeof elementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type IconElement = z.infer<typeof iconElementSchema>;

export const COATINGS = ["none", "matte", "gloss", "soft-touch"] as const;
export type Coating = (typeof COATINGS)[number];
export const COATING_LABELS: Record<Coating, { ar: string; en: string }> = {
  none: { ar: "بدون", en: "None" },
  matte: { ar: "سلوفان مطفي", en: "Matte" },
  gloss: { ar: "سلوفان لامع", en: "Gloss" },
  "soft-touch": { ar: "ناعم الملمس", en: "Soft-touch" },
};

const surfaceSchema = z.object({
  background: hex.nullable(),
  /** Whole-face lamination / varnish (shown in the 3D preview) */
  coating: z.enum(COATINGS).optional(),
  elements: z.array(elementSchema).max(60),
});
export type SurfaceDoc = z.infer<typeof surfaceSchema>;

export const designDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  templateCode: z.string().min(1).max(60),
  templateVersion: z.number().int().positive(),
  dimensions: z.object({ length: mm.positive(), width: mm.positive(), height: mm.positive() }),
  materialCode: z.string().max(60).nullable(),
  finishingCodes: z.array(z.string().max(60)).max(20),
  printOption: z.string().max(20).nullable().default(null),
  quantity: z.number().int().positive().max(10_000_000).nullable().default(null),
  /** Inside colour of the box (null = unprinted board) */
  interior: hex.nullable().default(null),
  surfaces: z.object(Object.fromEntries(SURFACE_KEYS.map((k) => [k, surfaceSchema])) as Record<SurfaceKey, typeof surfaceSchema>),
});
export type DesignDocument = z.infer<typeof designDocumentSchema>;

export function emptySurfaces(): Record<SurfaceKey, SurfaceDoc> {
  return Object.fromEntries(SURFACE_KEYS.map((k) => [k, { background: null, elements: [] }])) as unknown as Record<SurfaceKey, SurfaceDoc>;
}

export function newDocument(args: {
  templateCode: string;
  templateVersion: number;
  dimensions: Dimensions;
  materialCode: string | null;
}): DesignDocument {
  return {
    schemaVersion: 1,
    templateCode: args.templateCode,
    templateVersion: args.templateVersion,
    dimensions: { ...args.dimensions },
    materialCode: args.materialCode,
    finishingCodes: [],
    printOption: null,
    interior: null,
    quantity: null,
    surfaces: emptySurfaces(),
  };
}

/**
 * Reflow artwork after a dimension change: element centres keep their relative
 * position on the surface; elements that no longer fit are scaled down uniformly.
 */
export function reflowSurfaces(
  surfaces: Record<SurfaceKey, SurfaceDoc>,
  before: SurfaceSpec[],
  after: SurfaceSpec[],
): Record<SurfaceKey, SurfaceDoc> {
  const out = { ...surfaces };
  for (const spec of after) {
    const prev = before.find((s) => s.key === spec.key);
    const doc = surfaces[spec.key];
    if (!prev || !doc || (prev.w === spec.w && prev.h === spec.h)) continue;
    const kx = spec.w / prev.w;
    const ky = spec.h / prev.h;
    out[spec.key] = {
      ...doc,
      elements: doc.elements.map((el) => {
        const fit = Math.min(1, spec.w / el.width, spec.h / el.height);
        const scaled = { ...el, x: el.x * kx, y: el.y * ky, width: el.width * fit, height: el.height * fit };
        return el.type === "text" ? { ...scaled, fontSizeMm: (el as TextElement).fontSizeMm * fit } : scaled;
      }) as DesignElement[],
    };
  }
  return out;
}

/** Effective print resolution of a raster element (pixels per inch at printed size). */
export function effectiveDpi(el: ImageElement): number | null {
  if (el.mime === "image/svg+xml") return null;
  const dpiX = el.naturalWidth / (el.width / 25.4);
  const dpiY = el.naturalHeight / (el.height / 25.4);
  return Math.round(Math.min(dpiX, dpiY));
}

export const MIN_PRINT_DPI = 150;

/** Axis-aligned bounds of a (possibly rotated) element. */
export function elementBounds(el: DesignElement) {
  const rad = (el.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const bw = el.width * c + el.height * s;
  const bh = el.width * s + el.height * c;
  return { x0: el.x - bw / 2, y0: el.y - bh / 2, x1: el.x + bw / 2, y1: el.y + bh / 2 };
}

export function isOutsideSafeArea(el: DesignElement, surface: { w: number; h: number }, margin: number) {
  const b = elementBounds(el);
  return b.x0 < margin - 0.01 || b.y0 < margin - 0.01 || b.x1 > surface.w - margin + 0.01 || b.y1 > surface.h - margin + 0.01;
}

/** Collect every asset referenced by a document (for ownership checks). */
export function referencedAssetIds(doc: DesignDocument): string[] {
  const ids = new Set<string>();
  for (const k of SURFACE_KEYS) for (const el of doc.surfaces[k].elements) if (el.type === "image") ids.add(el.assetId);
  return [...ids];
}
