import { finalizeDieline, polyPanel, rectPanel, SURFACE_LABELS, taperedSideFlap } from "../geometry";
import type { Dimensions, PackagingEngine, Pt, SurfaceSpec, ValidationIssue } from "../types";

/**
 * Open tray with glued corner flaps (FEFCO 0422 family, simplified) — produce, bakery and food service.
 * Base in the centre, four walls around it, corner flaps on the front and back walls.
 */
export const foodTray: PackagingEngine = {
  key: "tray",
  geometryRevision: 1,
  boxStyle: "open",

  surfaces({ length: L, width: W, height: H }: Dimensions): SurfaceSpec[] {
    return [
      { key: "front", label: SURFACE_LABELS.front, w: L, h: H },
      { key: "back", label: SURFACE_LABELS.back, w: L, h: H },
      { key: "left", label: SURFACE_LABELS.left, w: W, h: H },
      { key: "right", label: SURFACE_LABELS.right, w: W, h: H },
      { key: "bottom", label: SURFACE_LABELS.bottom, w: L, h: W },
    ];
  },

  dieline({ length: L, width: W, height: H }: Dimensions) {
    const corner = H * 0.85;
    const panels = [
      rectPanel("base", { ar: "القاعدة", en: "Base" }, "face", 0, 0, L, W, { surface: "bottom", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      rectPanel("front", { ar: "الجدار الأمامي", en: "Front wall" }, "face", 0, -H, L, H, { surface: "front", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("back", { ar: "الجدار الخلفي", en: "Back wall" }, "face", 0, W, L, H, { surface: "back", sx: 0, sy: 0, sw: L, sh: H, rotation: 180 }),
      rectPanel("left", { ar: "الجدار الأيسر", en: "Left wall" }, "face", -H, 0, H, W, { surface: "left", sx: 0, sy: 0, sw: W, sh: H, rotation: 270 }),
      rectPanel("right", { ar: "الجدار الأيمن", en: "Right wall" }, "face", L, 0, H, W, { surface: "right", sx: 0, sy: 0, sw: W, sh: H, rotation: 90 }),
      polyPanel("corner-fl", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(0, -H, H, corner, -1, 8)),
      polyPanel("corner-fr", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(L, -H, H, corner, 1, 8)),
      polyPanel("corner-bl", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(0, W, H, corner, -1, 8)),
      polyPanel("corner-br", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(L, W, H, corner, 1, 8)),
    ];
    const folds: [Pt, Pt][] = [
      [[0, 0], [L, 0]],
      [[0, W], [L, W]],
      [[0, -H], [0, W + H]],
      [[L, -H], [L, W + H]],
    ];
    return finalizeDieline(panels, folds);
  },

  validate({ height: H, width: W }) {
    const issues: ValidationIssue[] = [];
    if (H > W) {
      issues.push({
        level: "warning",
        code: "tray.deep",
        message: { ar: "الصينية أعمق من عرضها؛ قد تحتاج تصميماً مختلفاً للزوايا.", en: "The tray is deeper than it is wide; the corners may need a different construction." },
      });
    }
    return issues;
  },
};
