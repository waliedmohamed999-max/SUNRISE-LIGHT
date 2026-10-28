import { boxSurfaces, finalizeDieline, polyPanel, rectPanel, taperedFlap, taperedSideFlap } from "../geometry";
import type { Dimensions, PackagingEngine, Pt, ValidationIssue } from "../types";

/**
 * Folding product carton — reverse tuck end (ECMA A20 family).
 * Body: glue | front | right | back | left. Top lid hinges on the back panel,
 * bottom closure hinges on the front panel, dust flaps on the side panels.
 */
const GLUE = 15;

export const foldingCarton: PackagingEngine = {
  key: "rte",
  geometryRevision: 1,
  boxStyle: "tuck",

  surfaces: (d) => boxSurfaces(d, { top: { ar: "غطاء علوي", en: "Top lid" }, bottom: { ar: "غطاء سفلي", en: "Bottom closure" } }),

  dieline({ length: L, width: W, height: H }: Dimensions) {
    const g = Math.min(GLUE, L / 3);
    const tuck = Math.min(Math.max(W * 0.35, 10), 25);
    const dust = W * 0.45;
    const xF = g;
    const xR = g + L;
    const xB = g + L + W;
    const xL = g + 2 * L + W;
    const end = g + 2 * L + 2 * W;

    const panels = [
      polyPanel("glue", { ar: "لسان اللصق", en: "Glue flap" }, "glue", taperedSideFlap(g, 0, H, g, -1, 6)),
      rectPanel("front", { ar: "أمامي", en: "Front" }, "face", xF, 0, L, H, { surface: "front", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("right", { ar: "أيمن", en: "Right" }, "face", xR, 0, W, H, { surface: "right", sx: 0, sy: 0, sw: W, sh: H, rotation: 0 }),
      rectPanel("back", { ar: "خلفي", en: "Back" }, "face", xB, 0, L, H, { surface: "back", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("left", { ar: "أيسر", en: "Left" }, "face", xL, 0, W, H, { surface: "left", sx: 0, sy: 0, sw: W, sh: H, rotation: 0 }),
      // top: lid on back panel
      rectPanel("top-lid", { ar: "الغطاء العلوي", en: "Top lid" }, "face", xB, -W, L, W, { surface: "top", sx: 0, sy: 0, sw: L, sh: W, rotation: 180 }),
      polyPanel("top-tuck", { ar: "لسان علوي", en: "Top tuck" }, "inner", taperedFlap(xB, -W, L, tuck, -1, 8)),
      polyPanel("top-dust-right", { ar: "لسان غبار", en: "Dust flap" }, "inner", taperedFlap(xR, 0, W, dust, -1, W * 0.25)),
      polyPanel("top-dust-left", { ar: "لسان غبار", en: "Dust flap" }, "inner", taperedFlap(xL, 0, W, dust, -1, W * 0.25)),
      // bottom: closure on front panel
      rectPanel("bottom-lid", { ar: "الغطاء السفلي", en: "Bottom closure" }, "face", xF, H, L, W, { surface: "bottom", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      polyPanel("bottom-tuck", { ar: "لسان سفلي", en: "Bottom tuck" }, "inner", taperedFlap(xF, H + W, L, tuck, 1, 8)),
      polyPanel("bottom-dust-right", { ar: "لسان غبار", en: "Dust flap" }, "inner", taperedFlap(xR, H, W, dust, 1, W * 0.25)),
      polyPanel("bottom-dust-left", { ar: "لسان غبار", en: "Dust flap" }, "inner", taperedFlap(xL, H, W, dust, 1, W * 0.25)),
    ];

    const folds: [Pt, Pt][] = [
      [[xR, 0], [end, 0]],
      [[xF, H], [xB, H]],
      [[xL, H], [end, H]],
      [[xB, -W], [xL, -W]],
      [[xF, H + W], [xR, H + W]],
      [[xF, 0], [xF, H]],
      [[xR, 0], [xR, H]],
      [[xB, 0], [xB, H]],
      [[xL, 0], [xL, H]],
    ];
    return finalizeDieline(panels, folds);
  },

  validate({ width: W }) {
    const issues: ValidationIssue[] = [];
    if (W < 20) {
      issues.push({
        level: "warning",
        code: "rte.narrow_tuck",
        message: {
          ar: "العرض الصغير يجعل لسان الإغلاق قصيراً جداً وقد لا يثبت جيداً.",
          en: "A small width produces a very short tuck flap that may not hold the closure well.",
        },
      });
    }
    return issues;
  },
};
