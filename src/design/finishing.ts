import type { BoxStyle, SurfaceKey } from "@/packaging/types";
import type { Coating, DesignDocument, Finish } from "./document";

/**
 * Order-level finishing codes (catalog "finishings") and how each one shows up in the studio.
 * - surface: one coating for the whole box (mutually exclusive) → sets the coating of every face
 * - decor:   foil / emboss / spot UV → applied to an element (the selected one, or the face logo)
 * - handles: bag handle style (mutually exclusive) → 3D handle
 * - structure: window, ribbon, holes, inserts … → drawn on the faces / in the 3D model
 * - note:    no visual effect (factory note only)
 */
export type FinishingGroup = "surface" | "decor" | "handles" | "structure" | "note";

export const SURFACE_FINISHING: Record<string, Coating> = {
  none: "none",
  "matte-varnish": "matte",
  "gloss-varnish": "gloss",
  "matte-lamination": "matte",
  "gloss-lamination": "gloss",
  "soft-touch": "soft-touch",
};

export const DECOR_FINISHING: Record<string, Finish> = {
  "hot-foil": "foil-gold",
  emboss: "emboss",
  deboss: "deboss",
  "spot-uv": "spot-uv",
};

export const HANDLE_CODES = ["paper-handles", "ribbon-handles"];
export const STRUCTURE_CODES = ["window-patch", "satin-ribbon", "handle-hole", "vent-holes", "tear-strip", "foam-insert", "inserts", "inside-print"];

export const GROUP_LABELS: Record<FinishingGroup, { ar: string; en: string; hint: { ar: string; en: string } }> = {
  surface: { ar: "طبقة السطح", en: "Surface coating", hint: { ar: "اختيار واحد — يُطبَّق على كل الأوجه", en: "One choice — applied to every face" } },
  decor: { ar: "البصمة والكفراج", en: "Foil & embossing", hint: { ar: "يُطبَّق على العنصر المحدد، أو على الشعار إن لم تحدد عنصرًا", en: "Applied to the selected element, or to the logo if none is selected" } },
  handles: { ar: "المقابض", en: "Handles", hint: { ar: "اختيار واحد — يظهر في المعاينة", en: "One choice — shown in 3D" } },
  structure: { ar: "إضافات الهيكل", en: "Structural add-ons", hint: { ar: "تظهر على العلبة في المعاينة", en: "Shown on the box in 3D" } },
  note: { ar: "ملاحظات للمصنع", en: "Factory notes", hint: { ar: "لا تغيّر الشكل — تُرسل مع طلب السعر", en: "No visual change — sent with the quote request" } },
};

export function finishingGroup(code: string): FinishingGroup {
  if (code in SURFACE_FINISHING) return "surface";
  if (code in DECOR_FINISHING) return "decor";
  if (HANDLE_CODES.includes(code)) return "handles";
  if (STRUCTURE_CODES.includes(code)) return "structure";
  return "note";
}

/** Coating implied by the chosen order finishing, if any. */
export function coatingFromCodes(codes: string[]): Coating | null {
  const c = codes.find((x) => x in SURFACE_FINISHING);
  return c ? SURFACE_FINISHING[c] : null;
}

/**
 * Toggle a finishing code and apply its visual effect to the document.
 * `target` is where decor finishes go: the selected element, else the largest image on the active face.
 */
export function toggleFinishing(doc: DesignDocument, code: string, ctx: { surfaceKey: SurfaceKey; selectedId: string | null; printable: SurfaceKey[] }): DesignDocument {
  const group = finishingGroup(code);
  // a chosen foil/emboss that nothing carries yet: pressing again applies it instead of removing it
  const on = doc.finishingCodes.includes(code) && !(group === "decor" && !decorApplied(doc, code));
  let codes = doc.finishingCodes.filter((c) => c !== code);
  if (!on) {
    if (group === "surface") codes = codes.filter((c) => finishingGroup(c) !== "surface");
    if (group === "handles") codes = codes.filter((c) => !HANDLE_CODES.includes(c));
    if (code !== "none") codes = codes.filter((c) => c !== "none");
    codes.push(code);
  }
  let next: DesignDocument = { ...doc, finishingCodes: codes };

  if (group === "surface") {
    const coating: Coating = on ? "none" : SURFACE_FINISHING[code];
    const surfaces = { ...next.surfaces };
    for (const k of ctx.printable) surfaces[k] = { ...surfaces[k], coating };
    next = { ...next, surfaces };
  }

  if (group === "decor") {
    const finish = DECOR_FINISHING[code];
    const same = (f?: Finish) => f === finish || (code === "hot-foil" && (f === "foil-gold" || f === "foil-silver"));
    const surfaces = { ...next.surfaces };
    if (on) {
      for (const k of ctx.printable) surfaces[k] = { ...surfaces[k], elements: surfaces[k].elements.map((e) => (same(e.finish) ? { ...e, finish: "none" as const } : e)) };
    } else if (!ctx.printable.some((k) => surfaces[k].elements.some((e) => same(e.finish)))) {
      const face = surfaces[ctx.surfaceKey];
      const pick =
        face.elements.find((e) => e.id === ctx.selectedId) ??
        [...face.elements].filter((e) => e.type === "image").sort((a, b) => b.width * b.height - a.width * a.height)[0] ??
        [...face.elements].filter((e) => e.type === "text").sort((a, b) => b.width * b.height - a.width * a.height)[0];
      if (pick) surfaces[ctx.surfaceKey] = { ...face, elements: face.elements.map((e) => (e.id === pick.id ? { ...e, finish } : e)) };
    }
    next = { ...next, surfaces };
  }

  if (code === "inside-print") next = { ...next, interior: on ? null : (next.interior ?? next.surfaces.front.background ?? "#2F357C") };
  return next;
}

/** Does any element carry the decor finish of this code? (used to tell the user nothing was applied) */
export function decorApplied(doc: DesignDocument, code: string): boolean {
  const finish = DECOR_FINISHING[code];
  return Object.values(doc.surfaces).some((s) => s.elements.some((e) => e.finish === finish || (code === "hot-foil" && (e.finish === "foil-gold" || e.finish === "foil-silver"))));
}

export const RIBBON_COLOR = "#B4142E";

/** Preview marks for structural add-ons, drawn over a face's artwork (canvas px, s = px per mm). */
export function drawStructure(ctx: CanvasRenderingContext2D, key: SurfaceKey, codes: string[], boxStyle: BoxStyle, w: number, h: number, s: number) {
  const has = (c: string) => codes.includes(c);
  const W = w * s;
  const H = h * s;
  const side = key === "left" || key === "right";
  ctx.save();

  if (has("window-patch") && key === "front") {
    const ww = W * 0.46, wh = H * 0.34, x = (W - ww) / 2, y = H * 0.3;
    const r = Math.min(ww, wh) * 0.12;
    ctx.beginPath();
    ctx.roundRect(x, y, ww, wh, r);
    ctx.fillStyle = "rgba(24,30,48,0.78)";
    ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + ww, y + wh);
    g.addColorStop(0, "rgba(255,255,255,0.35)");
    g.addColorStop(0.35, "rgba(255,255,255,0.05)");
    g.addColorStop(0.55, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0.04)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, 0.6 * s);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.stroke();
  }

  if (has("satin-ribbon") && boxStyle !== "bag" && (key === "front" || key === "top" || key === "back" || key === "bottom")) {
    const rw = Math.max(8, Math.min(w, h) * 0.12) * s;
    const x = (W - rw) / 2;
    const g = ctx.createLinearGradient(x, 0, x + rw, 0);
    g.addColorStop(0, "#7E0C1F");
    g.addColorStop(0.3, RIBBON_COLOR);
    g.addColorStop(0.5, "#E04A5F");
    g.addColorStop(0.7, RIBBON_COLOR);
    g.addColorStop(1, "#7E0C1F");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, rw, H);
  }

  if (has("tear-strip") && (key === "front" || side)) {
    const y = H * 0.12;
    ctx.setLineDash([3 * s, 2 * s]);
    ctx.lineWidth = Math.max(1, 0.5 * s);
    ctx.strokeStyle = "rgba(20,20,30,0.75)";
    for (const dy of [0, 4 * s]) {
      ctx.beginPath();
      ctx.moveTo(0, y + dy);
      ctx.lineTo(W, y + dy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (key === "front") {
      ctx.fillStyle = "rgba(20,20,30,0.75)";
      ctx.beginPath();
      ctx.moveTo(W - 10 * s, y);
      ctx.lineTo(W, y - 2 * s);
      ctx.lineTo(W, y + 6 * s);
      ctx.lineTo(W - 10 * s, y + 4 * s);
      ctx.fill();
    }
  }

  const hole = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#14100C";
    ctx.fill();
    ctx.lineWidth = Math.max(1, 0.4 * s);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.stroke();
  };

  if (has("handle-hole") && side && boxStyle !== "bag") {
    const rx = Math.min(W * 0.3, 45 * s), ry = Math.min(H * 0.07, 14 * s);
    hole(W / 2, H * 0.18 + ry, rx, ry);
  }
  if (has("handle-hole") && boxStyle === "bag" && (key === "front" || key === "back")) {
    const rx = Math.min(W * 0.18, 45 * s), ry = Math.min(H * 0.04, 12 * s);
    hole(W / 2, H * 0.08 + ry, rx, ry);
  }

  if (has("vent-holes") && side) {
    const r = Math.max(2, Math.min(w, h) * 0.05) * s;
    for (const fx of [0.25, 0.5, 0.75]) hole(W * fx, H * 0.55, r, r);
  }

  ctx.restore();
}
