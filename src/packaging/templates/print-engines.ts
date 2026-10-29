import { finalizeDieline, polyPanel, rectPanel } from "../geometry";
import type { Dimensions, PackagingEngine, Pt, SurfaceSpec, ValidationIssue } from "../types";

/* ───────────────────────── paper cup ───────────────────────── */

/**
 * Cup geometry from length = top (mouth) diameter, width = bottom diameter, height = height.
 * The printed wall unrolls into an annular sector ("fan"):
 *   slant s = √(h² + (R − r)²),  outer radius Ro = R·s/(R − r),  inner radius Ri = Ro − s,  angle θ = 2πR / Ro.
 * Artwork is designed on a flat rectangle (mid circumference × slant) and bent onto the fan for the dieline.
 */
export function cupGeometry({ length: Dt, width: Db, height: H }: Dimensions) {
  const R = Dt / 2;
  const r = Db / 2;
  const slant = Math.sqrt(H * H + (R - r) * (R - r));
  const Ro = (R * slant) / Math.max(0.001, R - r);
  const Ri = Ro - slant;
  const theta = (2 * Math.PI * R) / Ro;
  return { R, r, slant, Ro, Ri, theta, wrapWidth: Math.PI * (R + r) };
}

const CUP_OVERLAP = 8; // glued side seam, mm
const CUP_BOTTOM_CURL = 8; // bottom disc turned up into the wall, mm
const MIN_CUP_TAPER = 2; // top − bottom diameter, mm (keeps the unrolled fan radius bounded)

export const paperCup: PackagingEngine = {
  key: "cup",
  geometryRevision: 1,
  boxStyle: "cup",
  axes: {
    length: { ar: "قطر الفوهة", en: "Top diameter" },
    width: { ar: "قطر القاعدة", en: "Bottom diameter" },
    height: { ar: "الارتفاع", en: "Height" },
  },

  surfaces(d: Dimensions): SurfaceSpec[] {
    const g = cupGeometry(d);
    return [{ key: "front", label: { ar: "غلاف الكوب", en: "Cup wrap" }, w: g.wrapWidth, h: g.slant }];
  },

  dieline(d: Dimensions) {
    const g = cupGeometry(d);
    const seam = CUP_OVERLAP / g.Ro; // extra angle for the glue seam
    const a0 = -Math.PI / 2 - g.theta / 2;
    const a1 = a0 + g.theta;
    const N = 72;
    const arc = (rad: number, from: number, to: number) => Array.from({ length: N + 1 }, (_, i) => from + ((to - from) * i) / N).map((a) => [rad * Math.cos(a), rad * Math.sin(a)] as Pt);
    // fan centred on the y axis; shift so every coordinate is positive
    const outer = arc(g.Ro, a0, a1);
    const inner = arc(g.Ri, a1, a0);
    const seamPts: Pt[] = [...arc(g.Ro, a1, a1 + seam), ...arc(g.Ri, a1 + seam, a1)];
    const all = [...outer, ...inner, ...seamPts];
    const minX = Math.min(...all.map((p) => p[0]));
    const minY = Math.min(...all.map((p) => p[1]));
    const T = (p: Pt): Pt => [p[0] - minX, p[1] - minY];
    const wall = polyPanel("wall", { ar: "جدار الكوب", en: "Cup wall" }, "face", [...outer, ...inner].map(T));
    wall.art = { surface: "front", sx: 0, sy: 0, sw: g.wrapWidth, sh: g.slant, rotation: 0, fan: { cx: -minX, cy: -minY, ri: g.Ri, ro: g.Ro, a0, a1 } };
    const glue = polyPanel("seam", { ar: "لسان اللصق", en: "Glue seam" }, "glue", seamPts.map(T));
    const fanH = Math.max(...all.map((p) => p[1])) - minY;
    const disc = g.r + CUP_BOTTOM_CURL;
    const circle = Array.from({ length: 64 }, (_, i) => (i / 64) * Math.PI * 2).map((a) => [disc + disc * Math.cos(a), fanH + 20 + disc + disc * Math.sin(a)] as Pt);
    const bottom = polyPanel("bottom", { ar: "قاعدة الكوب", en: "Cup bottom" }, "inner", circle);
    const seamLine: [Pt, Pt] = [T([g.Ri * Math.cos(a1), g.Ri * Math.sin(a1)]), T([g.Ro * Math.cos(a1), g.Ro * Math.sin(a1)])];
    return finalizeDieline([wall, glue, bottom], [seamLine]);
  },

  validate({ length: Dt, width: Db, height: H }) {
    const issues: ValidationIssue[] = [];
    // the fan radius grows as R·s/(R − r): a near-cylinder needs a die metres wide, so require a real taper
    if (Dt - Db < MIN_CUP_TAPER) {
      issues.push({ level: "error", code: "cup.taper", message: { ar: `قطر القاعدة يجب أن يقل عن قطر الفوهة بـ ${MIN_CUP_TAPER} مم على الأقل.`, en: `The bottom diameter must be at least ${MIN_CUP_TAPER} mm smaller than the top.` } });
    } else if ((Dt - Db) / 2 / H > 0.35) {
      issues.push({ level: "warning", code: "cup.flare", message: { ar: "ميل الجدار كبير؛ قد يحتاج الكوب مراجعة فنية للثبات.", en: "The wall flares strongly; stability needs a technical review." } });
    }
    return issues;
  },
};

/* ───────────────────────── flat prints ───────────────────────── */

/** Rectangular flat print (sticker sheets, labels, wrapping paper): length × height, single printed face. */
export const flatSheet: PackagingEngine = {
  key: "sheet",
  geometryRevision: 1,
  boxStyle: "flat",
  axes: {
    length: { ar: "العرض", en: "Width" },
    height: { ar: "الارتفاع", en: "Height" },
  },

  surfaces({ length: L, height: H }: Dimensions): SurfaceSpec[] {
    return [{ key: "front", label: { ar: "الوجه المطبوع", en: "Printed face" }, w: L, h: H }];
  },

  dieline({ length: L, height: H }: Dimensions) {
    return finalizeDieline([rectPanel("face", { ar: "الوجه المطبوع", en: "Printed face" }, "face", 0, 0, L, H, { surface: "front", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 })], []);
  },

  validate() {
    return [];
  },
};

/** Round die-cut sticker / label: length = diameter. */
export const roundLabel: PackagingEngine = {
  key: "round",
  geometryRevision: 1,
  boxStyle: "disc",
  axes: { length: { ar: "القطر", en: "Diameter" } },

  surfaces({ length: D }: Dimensions): SurfaceSpec[] {
    return [{ key: "front", label: { ar: "الوجه المطبوع", en: "Printed face" }, w: D, h: D }];
  },

  dieline({ length: D }: Dimensions) {
    const r = D / 2;
    const pts = Array.from({ length: 96 }, (_, i) => (i / 96) * Math.PI * 2).map((a) => [r + r * Math.cos(a), r + r * Math.sin(a)] as Pt);
    const panel = polyPanel("face", { ar: "الملصق", en: "Sticker" }, "face", pts);
    panel.art = { surface: "front", sx: 0, sy: 0, sw: D, sh: D, rotation: 0 };
    return finalizeDieline([panel], []);
  },

  validate() {
    return [];
  },
};
