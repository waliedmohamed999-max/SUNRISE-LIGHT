import { finalizeDieline, polyPanel, rectPanel, SURFACE_LABELS, taperedSideFlap } from "../geometry";
import type { Dimensions, PackagingEngine, Pt, SurfaceSpec, ValidationIssue } from "../types";

/**
 * Paper carrier bag with gussets and block bottom (SOS style), with handles.
 * Blank: glue | front (L) | gusset (W) | back (L) | gusset (W); top hem turned inside;
 * bottom flaps form the block bottom (front and back flaps carry the bottom artwork).
 * Handles are not part of the blank. Simplified — confirm with the factory's bag machine settings.
 */
const GLUE = 20;
const HEM = 40;

export const paperBag: PackagingEngine = {
  key: "bag",
  geometryRevision: 1,
  boxStyle: "bag",

  surfaces({ length: L, width: W, height: H }: Dimensions): SurfaceSpec[] {
    return [
      { key: "front", label: SURFACE_LABELS.front, w: L, h: H },
      { key: "back", label: SURFACE_LABELS.back, w: L, h: H },
      { key: "left", label: { ar: "الطيّة اليسرى", en: "Left gusset" }, w: W, h: H },
      { key: "right", label: { ar: "الطيّة اليمنى", en: "Right gusset" }, w: W, h: H },
      { key: "bottom", label: SURFACE_LABELS.bottom, w: L, h: W },
    ];
  },

  dieline({ length: L, width: W, height: H }: Dimensions) {
    const g = GLUE;
    const B = W / 2;
    const xF = g;
    const xR = g + L;
    const xB = g + L + W;
    const xL = g + 2 * L + W;
    const end = g + 2 * L + 2 * W;
    const yBody = HEM;
    const yBottom = HEM + H;

    const panels = [
      rectPanel("hem", { ar: "الثنية العلوية", en: "Top hem" }, "inner", xF, 0, end - xF, HEM),
      polyPanel("glue", { ar: "لسان اللصق", en: "Glue flap" }, "glue", taperedSideFlap(g, yBody, H + B, g, -1, 6)),
      rectPanel("front", { ar: "الوجه الأمامي", en: "Front" }, "face", xF, yBody, L, H, { surface: "front", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("right", { ar: "الطيّة اليمنى", en: "Right gusset" }, "face", xR, yBody, W, H, { surface: "right", sx: 0, sy: 0, sw: W, sh: H, rotation: 0 }),
      rectPanel("back", { ar: "الوجه الخلفي", en: "Back" }, "face", xB, yBody, L, H, { surface: "back", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("left", { ar: "الطيّة اليسرى", en: "Left gusset" }, "face", xL, yBody, W, H, { surface: "left", sx: 0, sy: 0, sw: W, sh: H, rotation: 0 }),
      rectPanel("bottom-front", { ar: "قاع أمامي", en: "Bottom (front)" }, "flap", xF, yBottom, L, B, { surface: "bottom", sx: 0, sy: 0, sw: L, sh: B, rotation: 0 }),
      rectPanel("bottom-right", { ar: "قاع الطيّة", en: "Gusset bottom" }, "inner", xR, yBottom, W, B),
      rectPanel("bottom-back", { ar: "قاع خلفي", en: "Bottom (back)" }, "flap", xB, yBottom, L, B, { surface: "bottom", sx: 0, sy: W - B, sw: L, sh: B, rotation: 180 }),
      rectPanel("bottom-left", { ar: "قاع الطيّة", en: "Gusset bottom" }, "inner", xL, yBottom, W, B),
    ];
    const folds: [Pt, Pt][] = [
      [[xF, yBody], [end, yBody]],
      [[xF, yBottom], [end, yBottom]],
      [[xF, yBody], [xF, yBottom + B]],
      [[xR, yBody], [xR, yBottom + B]],
      [[xB, yBody], [xB, yBottom + B]],
      [[xL, yBody], [xL, yBottom + B]],
      // gusset centre creases
      [[xR + W / 2, yBody], [xR + W / 2, yBottom + B]],
      [[xL + W / 2, yBody], [xL + W / 2, yBottom + B]],
    ];
    return finalizeDieline(panels, folds);
  },

  validate({ length: L, width: W }) {
    const issues: ValidationIssue[] = [];
    if (W > L) {
      issues.push({
        level: "warning",
        code: "bag.gusset_wide",
        message: { ar: "عرض الطيّة الجانبية أكبر من عرض الكيس؛ يحتاج مراجعة فنية.", en: "The gusset is wider than the bag face; needs technical review." },
      });
    }
    return issues;
  },
};
