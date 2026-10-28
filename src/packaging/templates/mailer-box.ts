import { boxSurfaces, finalizeDieline, polyPanel, rectPanel, taperedFlap, taperedSideFlap } from "../geometry";
import type { Dimensions, PackagingEngine, Pt, ValidationIssue } from "../types";

/**
 * E-commerce mailer box — simplified roll-end tuck-front (FEFCO 0427 family).
 * Base in the centre; front wall above it (double wall), back wall + lid + tuck below,
 * double side walls left/right, dust ears on the front and back walls.
 * Simplified visual geometry — the factory dieline must be confirmed in technical review.
 */
export const mailerBox: PackagingEngine = {
  key: "mailer",
  geometryRevision: 1,
  boxStyle: "mailer",

  surfaces: (d) => boxSurfaces(d, { top: { ar: "الغطاء", en: "Lid" } }),

  dieline({ length: L, width: W, height: H }: Dimensions) {
    const ear = Math.min(W * 0.4, H * 1.2);
    const tuck = H * 0.85;
    const dust = H * 0.85;
    const lidY = W + H;
    const tuckY = 2 * W + H;

    const panels = [
      rectPanel("base", { ar: "القاعدة", en: "Base" }, "face", 0, 0, L, W, { surface: "bottom", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      rectPanel("front", { ar: "الجدار الأمامي", en: "Front wall" }, "face", 0, -H, L, H, { surface: "front", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("front-inner", { ar: "الجدار الأمامي الداخلي", en: "Front inner wall" }, "inner", 0, -2 * H, L, H),
      rectPanel("back", { ar: "الجدار الخلفي", en: "Back wall" }, "face", 0, W, L, H, { surface: "back", sx: 0, sy: 0, sw: L, sh: H, rotation: 180 }),
      rectPanel("lid", { ar: "الغطاء", en: "Lid" }, "face", 0, lidY, L, W, { surface: "top", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      polyPanel("lid-tuck", { ar: "لسان الإغلاق", en: "Lid tuck" }, "inner", taperedFlap(0, tuckY, L, tuck, 1, 12)),
      polyPanel("lid-dust-left", { ar: "لسان جانبي للغطاء", en: "Lid dust flap" }, "inner", taperedSideFlap(0, lidY, W, dust, -1, 12)),
      polyPanel("lid-dust-right", { ar: "لسان جانبي للغطاء", en: "Lid dust flap" }, "inner", taperedSideFlap(L, lidY, W, dust, 1, 12)),
      rectPanel("left", { ar: "الجدار الأيسر", en: "Left wall" }, "face", -H, 0, H, W, { surface: "left", sx: 0, sy: 0, sw: W, sh: H, rotation: 270 }),
      rectPanel("left-inner", { ar: "الجدار الأيسر الداخلي", en: "Left inner wall" }, "inner", -2 * H, 0, H, W),
      rectPanel("right", { ar: "الجدار الأيمن", en: "Right wall" }, "face", L, 0, H, W, { surface: "right", sx: 0, sy: 0, sw: W, sh: H, rotation: 90 }),
      rectPanel("right-inner", { ar: "الجدار الأيمن الداخلي", en: "Right inner wall" }, "inner", L + H, 0, H, W),
      polyPanel("ear-front-left", { ar: "أذن", en: "Ear" }, "inner", taperedSideFlap(0, -H, H, ear, -1, 6)),
      polyPanel("ear-front-right", { ar: "أذن", en: "Ear" }, "inner", taperedSideFlap(L, -H, H, ear, 1, 6)),
      polyPanel("ear-back-left", { ar: "أذن", en: "Ear" }, "inner", taperedSideFlap(0, W, H, ear, -1, 6)),
      polyPanel("ear-back-right", { ar: "أذن", en: "Ear" }, "inner", taperedSideFlap(L, W, H, ear, 1, 6)),
    ];

    const folds: [Pt, Pt][] = [
      [[0, 0], [L, 0]],
      [[0, W], [L, W]],
      [[0, -H], [L, -H]],
      [[0, lidY], [L, lidY]],
      [[0, tuckY], [L, tuckY]],
      [[0, -H], [0, tuckY]],
      [[L, -H], [L, tuckY]],
      [[-H, 0], [-H, W]],
      [[L + H, 0], [L + H, W]],
    ];
    return finalizeDieline(panels, folds);
  },

  validate({ width: W, height: H }) {
    const issues: ValidationIssue[] = [];
    if (H > W) {
      issues.push({
        level: "warning",
        code: "mailer.too_deep",
        message: {
          ar: "صناديق الشحن الإلكتروني تكون عادةً منخفضة؛ ارتفاع أكبر من العرض قد يتطلب تصميماً مختلفاً للغطاء.",
          en: "Mailer boxes are usually shallow; a height greater than the width may need a different lid construction.",
        },
      });
    }
    return issues;
  },
};
