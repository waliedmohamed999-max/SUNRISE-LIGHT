import { boxSurfaces, finalizeDieline, polyPanel, rectPanel, taperedFlap, taperedSideFlap } from "../geometry";
import type { Dimensions, PackagingEngine, Pt, ValidationIssue } from "../types";

/**
 * Pizza box — simplified roll-end tuck-front (FEFCO 0426 family).
 * Base in the centre; single front wall above it, double side walls, back wall + lid + front lid flap below.
 * Corner ears on the front and back walls lock into the double side walls.
 * Simplified visual geometry — confirm with the factory's pizza die before production.
 */
export const pizzaBox: PackagingEngine = {
  key: "pizza",
  geometryRevision: 1,
  boxStyle: "mailer",

  surfaces: (d) => boxSurfaces(d, { top: { ar: "الغطاء", en: "Lid" }, bottom: { ar: "القاعدة", en: "Base" } }),

  dieline({ length: L, width: W, height: H }: Dimensions) {
    const ear = Math.min(W * 0.3, H * 1.4);
    const flap = H * 0.9;
    const lidY = W + H;
    const flapY = 2 * W + H;

    const panels = [
      rectPanel("base", { ar: "القاعدة", en: "Base" }, "face", 0, 0, L, W, { surface: "bottom", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      rectPanel("front", { ar: "الجدار الأمامي", en: "Front wall" }, "face", 0, -H, L, H, { surface: "front", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("back", { ar: "الجدار الخلفي", en: "Back wall" }, "face", 0, W, L, H, { surface: "back", sx: 0, sy: 0, sw: L, sh: H, rotation: 180 }),
      rectPanel("lid", { ar: "الغطاء", en: "Lid" }, "face", 0, lidY, L, W, { surface: "top", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      polyPanel("lid-flap", { ar: "لسان الغطاء الأمامي", en: "Lid front flap" }, "inner", taperedFlap(0, flapY, L, flap, 1, 10)),
      polyPanel("lid-side-left", { ar: "لسان جانبي للغطاء", en: "Lid side flap" }, "inner", taperedSideFlap(0, lidY, W, H * 0.8, -1, 14)),
      polyPanel("lid-side-right", { ar: "لسان جانبي للغطاء", en: "Lid side flap" }, "inner", taperedSideFlap(L, lidY, W, H * 0.8, 1, 14)),
      rectPanel("left", { ar: "الجدار الأيسر", en: "Left wall" }, "face", -H, 0, H, W, { surface: "left", sx: 0, sy: 0, sw: W, sh: H, rotation: 270 }),
      rectPanel("left-inner", { ar: "الجدار الأيسر المزدوج", en: "Left double wall" }, "inner", -2 * H, 0, H, W),
      rectPanel("right", { ar: "الجدار الأيمن", en: "Right wall" }, "face", L, 0, H, W, { surface: "right", sx: 0, sy: 0, sw: W, sh: H, rotation: 90 }),
      rectPanel("right-inner", { ar: "الجدار الأيمن المزدوج", en: "Right double wall" }, "inner", L + H, 0, H, W),
      polyPanel("ear-fl", { ar: "أذن", en: "Ear" }, "inner", taperedSideFlap(0, -H, H, ear, -1, 4)),
      polyPanel("ear-fr", { ar: "أذن", en: "Ear" }, "inner", taperedSideFlap(L, -H, H, ear, 1, 4)),
      polyPanel("ear-bl", { ar: "أذن", en: "Ear" }, "inner", taperedSideFlap(0, W, H, ear, -1, 4)),
      polyPanel("ear-br", { ar: "أذن", en: "Ear" }, "inner", taperedSideFlap(L, W, H, ear, 1, 4)),
    ];
    const folds: [Pt, Pt][] = [
      [[0, 0], [L, 0]],
      [[0, W], [L, W]],
      [[0, lidY], [L, lidY]],
      [[0, flapY], [L, flapY]],
      [[0, -H], [0, flapY]],
      [[L, -H], [L, flapY]],
      [[-H, 0], [-H, W]],
      [[L + H, 0], [L + H, W]],
    ];
    return finalizeDieline(panels, folds);
  },

  validate({ length: L, width: W }) {
    const issues: ValidationIssue[] = [];
    if (Math.abs(L - W) > 40) {
      issues.push({
        level: "warning",
        code: "pizza.not_square",
        message: { ar: "صناديق البيتزا تكون مربعة عادةً؛ فرق كبير بين الطول والعرض يحتاج مراجعة.", en: "Pizza boxes are usually square; a large length/width difference needs review." },
      });
    }
    return issues;
  },
};
