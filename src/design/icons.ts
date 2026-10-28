/**
 * Vector elements for packaging: handling symbols (ISO 780 style), food/eco marks and basic shapes.
 * Drawn on a 24×24 grid; shapes may be stretched freely, symbols keep their proportions.
 */
export const ICON_KEYS = [
  "fragile",
  "this-way-up",
  "keep-dry",
  "keep-from-heat",
  "do-not-stack",
  "recyclable",
  "food-safe",
  "eco",
  "handle-care",
  "shape-rect",
  "shape-circle",
  "shape-frame",
  "shape-line",
  "shape-ribbon",
] as const;
export type IconKey = (typeof ICON_KEYS)[number];

type Part = { d: string; mode: "stroke" | "fill" };
export interface IconDef {
  parts: Part[];
  /** shapes stretch freely; symbols keep a square aspect */
  shape?: boolean;
  label: { ar: string; en: string };
  group: "handling" | "marks" | "shapes";
}

const s = (d: string): Part => ({ d, mode: "stroke" });
const f = (d: string): Part => ({ d, mode: "fill" });

export const ICONS: Record<IconKey, IconDef> = {
  fragile: { group: "handling", label: { ar: "قابل للكسر", en: "Fragile" }, parts: [s("M7 2.5h10l-.8 7.2a4.2 4.2 0 0 1-8.4 0z"), s("M12 14v6M8 21h8"), s("M11.2 2.5l1.6 3-1.6 2.2 1.4 2")] },
  "this-way-up": { group: "handling", label: { ar: "هذا الاتجاه لأعلى", en: "This way up" }, parts: [s("M8 19V5M4.5 8.5 8 5l3.5 3.5M16 19V5M12.5 8.5 16 5l3.5 3.5"), s("M3.5 21.5h17")] },
  "keep-dry": { group: "handling", label: { ar: "يُحفظ جافاً", en: "Keep dry" }, parts: [s("M3 12.5a9 9 0 0 1 18 0z"), s("M12 12.5v6.2a2 2 0 0 1-4 0"), s("M6 2v1.5M10 1.5V3M14 1.5V3M18 2v1.5")] },
  "keep-from-heat": { group: "handling", label: { ar: "بعيداً عن الحرارة", en: "Keep from heat" }, parts: [s("M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"), s("M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"), s("M3 21 21 3")] },
  "do-not-stack": { group: "handling", label: { ar: "لا تُرصّ", en: "Do not stack" }, parts: [s("M6 13h12v8H6zM8.5 4h7v7h-7z"), s("M3 3l18 18")] },
  "handle-care": { group: "handling", label: { ar: "يُحمل بعناية", en: "Handle with care" }, parts: [s("M4 13c2-1 3.5-1 5 .5l3 3c.8.8 2 .8 2.8 0l5.2-5.2"), s("M4 13v6h16v-3"), s("M9 9.5a3 3 0 1 1 6 0c0 2.5-3 4.5-3 4.5s-3-2-3-4.5z")] },
  recyclable: { group: "marks", label: { ar: "قابل لإعادة التدوير", en: "Recyclable" }, parts: [s("M9.2 6.8 12 2.5l2.8 4.3M14.8 6.8l1.4-2.5M12.6 20.5H20l-2.6-4.6M17.4 15.9l-2.8.1M4 20.5h7.4M6.6 15.9 4 20.5M6.6 15.9l2.6 1.4"), s("M8.3 13.8 5 15.6M15.7 13.8 19 15.6M12 9v-3")] },
  "food-safe": { group: "marks", label: { ar: "آمن للأغذية", en: "Food safe" }, parts: [s("M5 2.5h6l-.6 6.5a2.4 2.4 0 0 1-4.8 0z"), s("M8 11.5V20M5.5 20.5h5"), s("M15 2.5v5.5a2 2 0 0 0 4 0V2.5M17 2.5v19")] },
  eco: { group: "marks", label: { ar: "صديق للبيئة", en: "Eco friendly" }, parts: [s("M5 20c0-9.5 6-15.5 15-15.5 0 8.5-5.5 15.5-15 15.5z"), s("M5 20l8.5-8.5")] },
  "shape-rect": { group: "shapes", shape: true, label: { ar: "مستطيل", en: "Rectangle" }, parts: [f("M0 0h24v24H0z")] },
  "shape-circle": { group: "shapes", shape: true, label: { ar: "دائرة", en: "Circle" }, parts: [f("M12 0a12 12 0 1 1 0 24 12 12 0 0 1 0-24z")] },
  "shape-frame": { group: "shapes", shape: true, label: { ar: "إطار", en: "Frame" }, parts: [s("M1.5 1.5h21v21h-21z")] },
  "shape-line": { group: "shapes", shape: true, label: { ar: "خط", en: "Line" }, parts: [f("M0 10h24v4H0z")] },
  "shape-ribbon": { group: "shapes", shape: true, label: { ar: "شريط", en: "Ribbon band" }, parts: [f("M0 4h24l-3 8 3 8H0l3-8z")] },
};

const pathCache = new Map<string, Path2D>();
const path = (d: string) => {
  let p = pathCache.get(d);
  if (!p) pathCache.set(d, (p = new Path2D(d)));
  return p;
};

/** Draw an icon centred on the origin, filling a w×h box (pixels). */
export function drawIcon(ctx: CanvasRenderingContext2D, key: IconKey, w: number, h: number, color: string) {
  const def = ICONS[key];
  if (!def) return;
  ctx.save();
  ctx.translate(-w / 2, -h / 2);
  ctx.scale(w / 24, h / 24);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const part of def.parts) {
    if (part.mode === "fill") ctx.fill(path(part.d));
    else ctx.stroke(path(part.d));
  }
  ctx.restore();
}
