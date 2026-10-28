import { boxSurfaces, finalizeDieline, polyPanel, rectPanel, taperedFlap, taperedSideFlap } from "../geometry";
import type { Dimensions, PackagingEngine, Pt, ValidationIssue } from "../types";

/*
 * Additional structures. All are simplified visual geometry with exact surface mapping;
 * every one is flagged for technical review until the factory validates its die.
 * Dieline convention: viewed from the printed side, y down. Surface conventions: see types.ts.
 */

const warn = (code: string, ar: string, en: string): ValidationIssue => ({ level: "warning", code, message: { ar, en } });

/* ───────────── Straight tuck end (STE): both closures hinge on the back panel ───────────── */

export const straightTuck: PackagingEngine = {
  key: "ste",
  geometryRevision: 1,
  boxStyle: "tuck",
  surfaces: (d) => boxSurfaces(d, { top: { ar: "غطاء علوي", en: "Top lid" }, bottom: { ar: "غطاء سفلي", en: "Bottom lid" } }),
  dieline({ length: L, width: W, height: H }: Dimensions) {
    const g = Math.min(15, L / 3);
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
      rectPanel("top-lid", { ar: "الغطاء العلوي", en: "Top lid" }, "face", xB, -W, L, W, { surface: "top", sx: 0, sy: 0, sw: L, sh: W, rotation: 180 }),
      polyPanel("top-tuck", { ar: "لسان علوي", en: "Top tuck" }, "inner", taperedFlap(xB, -W, L, tuck, -1, 8)),
      polyPanel("top-dust-r", { ar: "لسان غبار", en: "Dust flap" }, "inner", taperedFlap(xR, 0, W, dust, -1, W * 0.25)),
      polyPanel("top-dust-l", { ar: "لسان غبار", en: "Dust flap" }, "inner", taperedFlap(xL, 0, W, dust, -1, W * 0.25)),
      // bottom lid also hinges on the back panel (seen from below: front edge at the top of the surface image)
      rectPanel("bottom-lid", { ar: "الغطاء السفلي", en: "Bottom lid" }, "face", xB, H, L, W, { surface: "bottom", sx: 0, sy: 0, sw: L, sh: W, rotation: 180 }),
      polyPanel("bottom-tuck", { ar: "لسان سفلي", en: "Bottom tuck" }, "inner", taperedFlap(xB, H + W, L, tuck, 1, 8)),
      polyPanel("bottom-dust-r", { ar: "لسان غبار", en: "Dust flap" }, "inner", taperedFlap(xR, H, W, dust, 1, W * 0.25)),
      polyPanel("bottom-dust-l", { ar: "لسان غبار", en: "Dust flap" }, "inner", taperedFlap(xL, H, W, dust, 1, W * 0.25)),
    ];
    const folds: [Pt, Pt][] = [
      [[xR, 0], [end, 0]],
      [[xR, H], [end, H]],
      [[xB, -W], [xL, -W]],
      [[xB, H + W], [xL, H + W]],
      [[xF, 0], [xF, H]],
      [[xR, 0], [xR, H]],
      [[xB, 0], [xB, H]],
      [[xL, 0], [xL, H]],
    ];
    return finalizeDieline(panels, folds);
  },
  validate: ({ width: W }) => (W < 20 ? [warn("ste.narrow", "العرض الصغير يجعل لسان الإغلاق قصيراً جداً.", "A small width makes the tuck flap very short.")] : []),
};

/* ───────────── Full telescope box: lid tray over a base tray (gift, shoe, cake, apparel) ───────────── */

/** Tray seen from outside with its base as `baseSurface`; walls map to the box sides. */
function trayPanels(prefix: string, x0: number, L: number, W: number, H: number, mode: "lid" | "base", printable: boolean) {
  const name = (ar: string, en: string) => ({ ar: `${ar}`, en: `${en}` });
  const corner = H * 0.85;
  if (mode === "lid") {
    // lid seen from above: front edge at the bottom of the image → front wall below, back wall above
    return [
      rectPanel(`${prefix}-top`, name("سطح الغطاء", "Lid top"), "face", x0, 0, L, W, printable ? { surface: "top", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 } : undefined),
      rectPanel(`${prefix}-front`, name("حافة أمامية", "Lid front"), "face", x0, W, L, H, printable ? { surface: "front", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 } : undefined),
      rectPanel(`${prefix}-back`, name("حافة خلفية", "Lid back"), "face", x0, -H, L, H, printable ? { surface: "back", sx: 0, sy: 0, sw: L, sh: H, rotation: 180 } : undefined),
      rectPanel(`${prefix}-left`, name("حافة يسرى", "Lid left"), "face", x0 - H, 0, H, W, printable ? { surface: "left", sx: 0, sy: 0, sw: W, sh: H, rotation: 90 } : undefined),
      rectPanel(`${prefix}-right`, name("حافة يمنى", "Lid right"), "face", x0 + L, 0, H, W, printable ? { surface: "right", sx: 0, sy: 0, sw: W, sh: H, rotation: 270 } : undefined),
      polyPanel(`${prefix}-c1`, name("لسان زاوية", "Corner flap"), "glue", taperedSideFlap(x0, W, H, corner, -1, 6)),
      polyPanel(`${prefix}-c2`, name("لسان زاوية", "Corner flap"), "glue", taperedSideFlap(x0 + L, W, H, corner, 1, 6)),
      polyPanel(`${prefix}-c3`, name("لسان زاوية", "Corner flap"), "glue", taperedSideFlap(x0, -H, H, corner, -1, 6)),
      polyPanel(`${prefix}-c4`, name("لسان زاوية", "Corner flap"), "glue", taperedSideFlap(x0 + L, -H, H, corner, 1, 6)),
    ];
  }
  // base seen from below: front edge at the top of the image → front wall above
  return [
    rectPanel(`${prefix}-bottom`, name("قاعدة", "Base"), "face", x0, 0, L, W, printable ? { surface: "bottom", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 } : undefined),
    rectPanel(`${prefix}-front`, name("جدار القاعدة", "Base wall"), "inner", x0, -H, L, H),
    rectPanel(`${prefix}-back`, name("جدار القاعدة", "Base wall"), "inner", x0, W, L, H),
    rectPanel(`${prefix}-left`, name("جدار القاعدة", "Base wall"), "inner", x0 - H, 0, H, W),
    rectPanel(`${prefix}-right`, name("جدار القاعدة", "Base wall"), "inner", x0 + L, 0, H, W),
    polyPanel(`${prefix}-c1`, name("لسان زاوية", "Corner flap"), "glue", taperedSideFlap(x0, -H, H, corner, -1, 6)),
    polyPanel(`${prefix}-c2`, name("لسان زاوية", "Corner flap"), "glue", taperedSideFlap(x0 + L, -H, H, corner, 1, 6)),
    polyPanel(`${prefix}-c3`, name("لسان زاوية", "Corner flap"), "glue", taperedSideFlap(x0, W, H, corner, -1, 6)),
    polyPanel(`${prefix}-c4`, name("لسان زاوية", "Corner flap"), "glue", taperedSideFlap(x0 + L, W, H, corner, 1, 6)),
  ];
}

function trayFolds(x0: number, L: number, W: number, H: number): [Pt, Pt][] {
  return [
    [[x0, 0], [x0 + L, 0]],
    [[x0, W], [x0 + L, W]],
    [[x0, -H], [x0, W + H]],
    [[x0 + L, -H], [x0 + L, W + H]],
  ];
}

export const telescopeBox: PackagingEngine = {
  key: "telescope",
  geometryRevision: 1,
  boxStyle: "closed",
  surfaces: (d) => boxSurfaces(d, { top: { ar: "سطح الغطاء", en: "Lid top" } }),
  dieline({ length: L, width: W, height: H }: Dimensions) {
    // the printed size is the lid; the base sits inside it
    const gap = H * 2 + 40;
    const bx = L + gap + H;
    // preview geometry: base tray drawn at the box footprint; the real lid/base clearance is set in technical review
    const panels = [...trayPanels("lid", 0, L, W, H, "lid", true), ...trayPanels("base", bx, L, W, H - 2, "base", true)];
    return finalizeDieline(panels, [...trayFolds(0, L, W, H), ...trayFolds(bx, L, W, H - 2)]);
  },
  validate: ({ height: H, width: W }) => (H > W ? [warn("telescope.deep", "غطاء أعمق من عرضه؛ قد يصعب فتحه.", "A lid deeper than its width can be hard to lift.")] : []),
};

/* ───────────── Drawer box: printed sleeve + tray (luxury perfume, jewellery, chocolate) ───────────── */

export const drawerBox: PackagingEngine = {
  key: "drawer",
  geometryRevision: 1,
  boxStyle: "closed",
  surfaces: (d) => boxSurfaces(d, { left: { ar: "طرف الدرج الأيسر", en: "Drawer end (left)" }, right: { ar: "طرف الدرج الأيمن", en: "Drawer end (right)" } }),
  dieline({ length: L, width: W, height: H }: Dimensions) {
    const g = 15;
    // sleeve strip (x = length): top, front, bottom, back, glue — open at the left and right ends
    const yTop = 0;
    const yFront = W;
    const yBottom = W + H;
    const yBack = 2 * W + H;
    const yGlue = 2 * W + 2 * H;
    const sleeve = [
      rectPanel("sleeve-top", { ar: "سطح الغلاف", en: "Sleeve top" }, "face", 0, yTop, L, W, { surface: "top", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      rectPanel("sleeve-front", { ar: "وجه الغلاف", en: "Sleeve front" }, "face", 0, yFront, L, H, { surface: "front", sx: 0, sy: 0, sw: L, sh: H, rotation: 0 }),
      rectPanel("sleeve-bottom", { ar: "قاع الغلاف", en: "Sleeve bottom" }, "face", 0, yBottom, L, W, { surface: "bottom", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      rectPanel("sleeve-back", { ar: "ظهر الغلاف", en: "Sleeve back" }, "face", 0, yBack, L, H, { surface: "back", sx: 0, sy: 0, sw: L, sh: H, rotation: 180 }),
      polyPanel("sleeve-glue", { ar: "لسان اللصق", en: "Glue flap" }, "glue", taperedFlap(0, yGlue, L, g, 1, 8)),
    ];
    // tray to the right: base seen from below, end walls carry the left/right artwork
    const tx = L + H + 40;
    // preview geometry: tray drawn at the sleeve's inner size; the slide clearance is set in technical review
    const tL = L - 3;
    const tW = W;
    const tH = H;
    const tray = [
      rectPanel("tray-base", { ar: "قاع الدرج", en: "Tray base" }, "inner", tx, 0, tL, tW),
      rectPanel("tray-front", { ar: "جدار الدرج", en: "Tray wall" }, "inner", tx, -tH, tL, tH),
      rectPanel("tray-back", { ar: "جدار الدرج", en: "Tray wall" }, "inner", tx, tW, tL, tH),
      rectPanel("tray-left", { ar: "طرف الدرج الأيسر", en: "Drawer end (left)" }, "face", tx - tH, 0, tH, tW, { surface: "left", sx: 0, sy: 0, sw: W, sh: H, rotation: 270 }),
      rectPanel("tray-right", { ar: "طرف الدرج الأيمن", en: "Drawer end (right)" }, "face", tx + tL, 0, tH, tW, { surface: "right", sx: 0, sy: 0, sw: W, sh: H, rotation: 90 }),
      polyPanel("tray-c1", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(tx, -tH, tH, tH * 0.85, -1, 6)),
      polyPanel("tray-c2", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(tx + tL, -tH, tH, tH * 0.85, 1, 6)),
      polyPanel("tray-c3", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(tx, tW, tH, tH * 0.85, -1, 6)),
      polyPanel("tray-c4", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(tx + tL, tW, tH, tH * 0.85, 1, 6)),
    ];
    const folds: [Pt, Pt][] = [
      [[0, yFront], [L, yFront]],
      [[0, yBottom], [L, yBottom]],
      [[0, yBack], [L, yBack]],
      [[0, yGlue], [L, yGlue]],
      ...trayFolds(tx, tL, tW, tH),
    ];
    return finalizeDieline([...sleeve, ...tray], folds);
  },
  validate: ({ length: L, width: W }) => (L < W ? [warn("drawer.short", "الدرج أقصر من عرضه؛ قد يصعب سحبه.", "A drawer shorter than it is wide can be awkward to pull.")] : []),
};

/* ───────────── Clamshell (burger / sandwich / meal box): base tray + hinged lid tray ───────────── */

export const clamshell: PackagingEngine = {
  key: "clamshell",
  geometryRevision: 1,
  boxStyle: "closed",
  surfaces: (d) => boxSurfaces(d, { top: { ar: "الغطاء", en: "Lid" } }),
  dieline({ length: L, width: W, height: H }: Dimensions) {
    const h = H / 2;
    const lidBackY = W + h;
    const lidTopY = W + 2 * h;
    const lidFrontY = 2 * W + 2 * h;
    const corner = h * 0.85;
    const panels = [
      // base tray (seen from below: front wall above the base)
      rectPanel("base", { ar: "القاعدة", en: "Base" }, "face", 0, 0, L, W, { surface: "bottom", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      rectPanel("base-front", { ar: "النصف السفلي الأمامي", en: "Lower front" }, "face", 0, -h, L, h, { surface: "front", sx: 0, sy: h, sw: L, sh: h, rotation: 0 }),
      rectPanel("base-back", { ar: "النصف السفلي الخلفي", en: "Lower back" }, "face", 0, W, L, h, { surface: "back", sx: 0, sy: h, sw: L, sh: h, rotation: 180 }),
      rectPanel("base-left", { ar: "النصف السفلي الأيسر", en: "Lower left" }, "face", -h, 0, h, W, { surface: "left", sx: 0, sy: h, sw: W, sh: h, rotation: 270 }),
      rectPanel("base-right", { ar: "النصف السفلي الأيمن", en: "Lower right" }, "face", L, 0, h, W, { surface: "right", sx: 0, sy: h, sw: W, sh: h, rotation: 90 }),
      // lid tray, hinged along the back
      rectPanel("lid-back", { ar: "النصف العلوي الخلفي", en: "Upper back" }, "face", 0, lidBackY, L, h, { surface: "back", sx: 0, sy: 0, sw: L, sh: h, rotation: 180 }),
      rectPanel("lid-top", { ar: "الغطاء", en: "Lid" }, "face", 0, lidTopY, L, W, { surface: "top", sx: 0, sy: 0, sw: L, sh: W, rotation: 0 }),
      rectPanel("lid-front", { ar: "النصف العلوي الأمامي", en: "Upper front" }, "face", 0, lidFrontY, L, h, { surface: "front", sx: 0, sy: 0, sw: L, sh: h, rotation: 0 }),
      rectPanel("lid-left", { ar: "النصف العلوي الأيسر", en: "Upper left" }, "face", -h, lidTopY, h, W, { surface: "left", sx: 0, sy: 0, sw: W, sh: h, rotation: 90 }),
      rectPanel("lid-right", { ar: "النصف العلوي الأيمن", en: "Upper right" }, "face", L, lidTopY, h, W, { surface: "right", sx: 0, sy: 0, sw: W, sh: h, rotation: 270 }),
      polyPanel("base-c1", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(0, -h, h, corner, -1, 4)),
      polyPanel("base-c2", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(L, -h, h, corner, 1, 4)),
      polyPanel("lid-c1", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(0, lidFrontY, h, corner, -1, 4)),
      polyPanel("lid-c2", { ar: "لسان زاوية", en: "Corner flap" }, "glue", taperedSideFlap(L, lidFrontY, h, corner, 1, 4)),
    ];
    const folds: [Pt, Pt][] = [
      [[0, 0], [L, 0]],
      [[0, W], [L, W]],
      [[0, lidBackY], [L, lidBackY]],
      [[0, lidTopY], [L, lidTopY]],
      [[0, lidFrontY], [L, lidFrontY]],
      [[0, -h], [0, W]],
      [[L, -h], [L, W]],
      [[0, lidTopY], [0, lidFrontY + h]],
      [[L, lidTopY], [L, lidFrontY + h]],
    ];
    return finalizeDieline(panels, folds);
  },
  validate: ({ height: H }) => (H < 40 ? [warn("clamshell.low", "ارتفاع صغير جداً لصندوق وجبات.", "Very low for a meal box.")] : []),
};
