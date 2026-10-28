import { boxSurfaces, finalizeDieline, rectPanel, taperedSideFlap, polyPanel } from "../geometry";
import type { Dimensions, PackagingEngine, Pt, ValidationIssue } from "../types";

/**
 * Regular slotted carton (FEFCO 0201 style).
 * Body: glue | front (L) | right (W) | back (L) | left (W). Flap depth = W / 2.
 * The outer (major) flaps carry the top/bottom artwork; minor flaps are inner.
 * Board thickness allowances are NOT applied — visual geometry only.
 */
const GLUE = 35;

export const shippingCarton: PackagingEngine = {
  key: "rsc",
  geometryRevision: 1,
  boxStyle: "closed",

  surfaces: (d) => boxSurfaces(d),

  dieline({ length: L, width: W, height: H }: Dimensions) {
    const g = Math.min(GLUE, H / 2);
    const f = W / 2;
    const xF = g;
    const xR = g + L;
    const xB = g + L + W;
    const xL = g + 2 * L + W;
    const end = g + 2 * L + 2 * W;
    const yB = f + H;

    const panels = [
      polyPanel("glue", { ar: "لسان اللصق", en: "Glue flap" }, "glue", taperedSideFlap(g, f, H, g, -1, 10)),
      rectPanel("front", { ar: "أمامي", en: "Front" }, "face", xF, f, L, H, { surface: "front", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("right", { ar: "أيمن", en: "Right" }, "face", xR, f, W, H, { surface: "right", sx: 0, sy: 0, sw: W, sh: H, rotation: 0 }),
      rectPanel("back", { ar: "خلفي", en: "Back" }, "face", xB, f, L, H, { surface: "back", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("left", { ar: "أيسر", en: "Left" }, "face", xL, f, W, H, { surface: "left", sx: 0, sy: 0, sw: W, sh: H, rotation: 0 }),
      // top flaps
      rectPanel("top-front", { ar: "لسان علوي أمامي", en: "Top flap (front)" }, "flap", xF, 0, L, f, { surface: "top", sx: 0, sy: W - f, sw: L, sh: f, rotation: 0 }),
      rectPanel("top-right", { ar: "لسان علوي داخلي", en: "Top inner flap" }, "inner", xR, 0, W, f),
      rectPanel("top-back", { ar: "لسان علوي خلفي", en: "Top flap (back)" }, "flap", xB, 0, L, f, { surface: "top", sx: 0, sy: 0, sw: L, sh: f, rotation: 180 }),
      rectPanel("top-left", { ar: "لسان علوي داخلي", en: "Top inner flap" }, "inner", xL, 0, W, f),
      // bottom flaps
      rectPanel("bottom-front", { ar: "لسان سفلي أمامي", en: "Bottom flap (front)" }, "flap", xF, yB, L, f, { surface: "bottom", sx: 0, sy: 0, sw: L, sh: f, rotation: 0 }),
      rectPanel("bottom-right", { ar: "لسان سفلي داخلي", en: "Bottom inner flap" }, "inner", xR, yB, W, f),
      rectPanel("bottom-back", { ar: "لسان سفلي خلفي", en: "Bottom flap (back)" }, "flap", xB, yB, L, f, { surface: "bottom", sx: 0, sy: W - f, sw: L, sh: f, rotation: 180 }),
      rectPanel("bottom-left", { ar: "لسان سفلي داخلي", en: "Bottom inner flap" }, "inner", xL, yB, W, f),
    ];

    const folds: [Pt, Pt][] = [
      [[xF, f], [end, f]],
      [[xF, yB], [end, yB]],
      [[xF, f], [xF, yB]],
      [[xR, f], [xR, yB]],
      [[xB, f], [xB, yB]],
      [[xL, f], [xL, yB]],
    ];
    return finalizeDieline(panels, folds);
  },

  validate({ length: L, width: W }) {
    const issues: ValidationIssue[] = [];
    if (W > L) {
      issues.push({
        level: "warning",
        code: "rsc.width_gt_length",
        message: {
          ar: "يكون الطول عادةً أكبر من أو يساوي العرض في الكراتين المشقوقة. سيتم التحقق فنياً.",
          en: "For slotted cartons the length is normally ≥ the width. This will be checked during technical review.",
        },
      });
    }
    return issues;
  },
};
