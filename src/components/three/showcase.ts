"use client";

import { getEngine } from "@/packaging/engine";
import type { Dimensions, SurfaceKey } from "@/packaging/types";

/* Procedural artwork for showcase objects — Sunrise Light's own mark only, no customer branding. */

/* ───────────── official brand mark (orange "S"), tinted per print colour ───────────── */

let markImg: HTMLImageElement | null = null;
const lockups: { light?: HTMLImageElement; dark?: HTMLImageElement } = {};
let markPromise: Promise<void> | null = null;
/** Resolves once /brand/mark.png is decoded; scenes await this before painting artwork. */
export function brandMarkReady(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!markPromise) {
    const load = (src: string) => {
      const img = new Image();
      img.src = src;
      return img.decode().then(() => img);
    };
    markPromise = Promise.all([load("/brand/mark.png"), load("/brand/logo.png"), load("/brand/logo-dark.png")])
      .then(([m, light, dark]) => {
        markImg = m;
        lockups.light = light;
        lockups.dark = dark;
      })
      .catch(() => undefined);
  }
  return markPromise;
}

const tinted = new Map<string, HTMLCanvasElement>();
function tintedMark(color: string) {
  if (!markImg) return null;
  let t = tinted.get(color);
  if (!t) {
    t = document.createElement("canvas");
    t.width = markImg.naturalWidth;
    t.height = markImg.naturalHeight;
    const x = t.getContext("2d")!;
    x.drawImage(markImg, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = color;
    x.fillRect(0, 0, t.width, t.height);
    tinted.set(color, t);
  }
  return t;
}

/**
 * Prints the brand mark centred around (cx, cy); r is the visual radius of the old sun symbol,
 * so callers keep their proportions. Falls back to the sun symbol until the mark has loaded.
 */
export function sunMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  const m = tintedMark(color);
  if (m) {
    const h = r * 2.5;
    const w = (h * m.width) / m.height;
    ctx.drawImage(m, cx - w / 2, cy - h * 0.74, w, h);
    return;
  }
  legacySunMark(ctx, cx, cy, r, color);
}

/**
 * Prints the full official logo lockup centred at (cx, cy), `width` pixels wide.
 * "light" = original navy/orange (for kraft and light boards); "dark" = cream lettering (dark or printed boards).
 * Returns false if the logo isn't loaded yet.
 */
export function brandLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, variant: "light" | "dark") {
  const img = lockups[variant];
  if (!img) return false;
  const h = (width * img.naturalHeight) / img.naturalWidth;
  ctx.drawImage(img, cx - width / 2, cy - h / 2, width, h);
  return true;
}

function legacySunMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = "round";
  for (const a of [-150, -120, -90, -60, -30]) {
    const rad = (a * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * r * 1.25, cy + Math.sin(rad) * r * 1.25);
    ctx.lineTo(cx + Math.cos(rad) * r * 1.6, cy + Math.sin(rad) * r * 1.6);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - r * 1.5, cy + r * 0.08, r * 3, r * 0.2);
  ctx.restore();
}

export function grainFill(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, amount = 14) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  let seed = 11;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const n = ((seed % 100) / 100 - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `500 ${size}px Inter, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function surfaceCanvases(dims: Dimensions, engineKey: string, paint: (key: SurfaceKey, ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const out = {} as Record<SurfaceKey, HTMLCanvasElement>;
  for (const s of getEngine(engineKey).surfaces(dims)) {
    const k = 512 / Math.max(s.w, s.h);
    const c = document.createElement("canvas");
    c.width = Math.round(s.w * k);
    c.height = Math.round(s.h * k);
    paint(s.key, c.getContext("2d")!, c.width, c.height);
    out[s.key] = c;
  }
  return out;
}

export type ShowcaseKind = "rsc" | "mailer" | "rte" | "cup" | "print" | "pizza" | "bag" | "tray";

export const SHOWCASE_DIMS: Record<Exclude<ShowcaseKind, "cup">, { engine: string; dims: Dimensions; material: string; style: "closed" | "mailer" | "tuck" | "open" | "bag" }> = {
  rsc: { engine: "rsc", dims: { length: 400, width: 300, height: 260 }, material: "#B98C5A", style: "closed" },
  mailer: { engine: "mailer", dims: { length: 300, width: 220, height: 90 }, material: "#E8D9C4", style: "mailer" },
  rte: { engine: "rte", dims: { length: 80, width: 60, height: 170 }, material: "#F2E6D6", style: "tuck" },
  print: { engine: "rsc", dims: { length: 300, width: 300, height: 300 }, material: "#FFEDD7", style: "closed" },
  pizza: { engine: "pizza", dims: { length: 330, width: 330, height: 45 }, material: "#E8D9C4", style: "mailer" },
  bag: { engine: "bag", dims: { length: 260, width: 120, height: 330 }, material: "#B98C5A", style: "bag" },
  tray: { engine: "tray", dims: { length: 300, width: 200, height: 80 }, material: "#B98C5A", style: "open" },
};

export function showcaseCanvases(kind: Exclude<ShowcaseKind, "cup">): Record<SurfaceKey, HTMLCanvasElement> {
  const { engine, dims } = SHOWCASE_DIMS[kind];
  if (kind === "rsc") {
    return surfaceCanvases(dims, engine, (key, ctx, w, h) => {
      grainFill(ctx, w, h, "#B98C5A", 18);
      if ((key === "front" || key === "back") && !brandLogo(ctx, w / 2, h * 0.5, w * 0.62, "light")) {
        sunMark(ctx, w * 0.5, h * 0.52, Math.min(w, h) * 0.12, "#100904");
        label(ctx, "SUNRISE LIGHT", w / 2, h * 0.74, h * 0.06, "#100904");
      }
      if (key === "right" || key === "left") {
        ctx.strokeStyle = "#100904";
        ctx.lineWidth = w * 0.022;
        for (const dx of [-0.12, 0.12]) {
          ctx.beginPath();
          ctx.moveTo(w * (0.5 + dx), h * 0.32);
          ctx.lineTo(w * (0.5 + dx), h * 0.15);
          ctx.lineTo(w * (0.5 + dx) - w * 0.05, h * 0.22);
          ctx.moveTo(w * (0.5 + dx), h * 0.15);
          ctx.lineTo(w * (0.5 + dx) + w * 0.05, h * 0.22);
          ctx.stroke();
        }
      }
      if (key === "top" || key === "bottom") {
        ctx.fillStyle = "rgba(16,9,4,0.55)";
        ctx.fillRect(w * 0.45, 0, w * 0.1, h);
      }
    });
  }
  if (kind === "mailer") {
    return surfaceCanvases(dims, engine, (key, ctx, w, h) => {
      grainFill(ctx, w, h, key === "top" ? "#382416" : "#E8D9C4", key === "top" ? 10 : 6);
      if (key === "top") {
        if (!brandLogo(ctx, w / 2, h * 0.5, w * 0.6, "dark")) {
          sunMark(ctx, w / 2, h * 0.55, h * 0.15, "#EA5B32");
          label(ctx, "SUNRISE LIGHT", w / 2, h * 0.75, h * 0.055, "#FFEDD7");
        }
      } else {
        ctx.fillStyle = "#EA5B32";
        ctx.fillRect(0, h * 0.86, w, h * 0.04);
      }
    });
  }
  if (kind === "rte") {
    return surfaceCanvases(dims, engine, (key, ctx, w, h) => {
      grainFill(ctx, w, h, "#F2E6D6", 6);
      if (key === "front" || key === "back") {
        sunMark(ctx, w / 2, h * 0.3, w * 0.17, "#EA5B32");
        ctx.fillStyle = "#100904";
        ctx.fillRect(w * 0.18, h * 0.46, w * 0.64, h * 0.01);
        label(ctx, "No. 01", w / 2, h * 0.53, w * 0.09, "#100904");
        ctx.fillStyle = "#382416";
        ctx.fillRect(0, h * 0.82, w, h * 0.18);
      }
      if (key === "top" || key === "bottom") {
        ctx.fillStyle = "#382416";
        ctx.fillRect(0, 0, w, h);
      }
    });
  }
  if (kind === "pizza") {
    return surfaceCanvases(dims, engine, (key, ctx, w, h) => {
      grainFill(ctx, w, h, key === "top" ? "#C2470C" : "#E8D9C4", 8);
      if (key === "top") {
        sunMark(ctx, w / 2, h * 0.5, w * 0.16, "#FFEDD7");
        label(ctx, "FRESH · HOT", w / 2, h * 0.7, w * 0.05, "#FFEDD7");
      } else if (key !== "bottom") {
        ctx.fillStyle = "#C2470C";
        ctx.fillRect(0, h * 0.7, w, h * 0.3);
      }
    });
  }
  if (kind === "bag") {
    return surfaceCanvases(dims, engine, (key, ctx, w, h) => {
      grainFill(ctx, w, h, "#B98C5A", 16);
      if ((key === "front" || key === "back") && !brandLogo(ctx, w / 2, h * 0.5, w * 0.78, "light")) {
        sunMark(ctx, w / 2, h * 0.48, w * 0.16, "#100904");
        label(ctx, "SUNRISE LIGHT", w / 2, h * 0.6, w * 0.06, "#100904");
      }
    });
  }
  if (kind === "tray") {
    return surfaceCanvases(dims, engine, (key, ctx, w, h) => {
      grainFill(ctx, w, h, "#B98C5A", 16);
      if (key === "front") sunMark(ctx, w / 2, h * 0.62, h * 0.26, "#FFEDD7");
    });
  }
  // print: full-bleed printed artwork, shows colour + finishing capability
  return surfaceCanvases(dims, engine, (key, ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#EA5B32");
    g.addColorStop(0.55, "#8F2F05");
    g.addColorStop(1, "#382416");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,237,215,0.22)";
    ctx.lineWidth = 2;
    for (let i = -h; i < w; i += 26) {
      ctx.beginPath();
      ctx.moveTo(i, h);
      ctx.lineTo(i + h, 0);
      ctx.stroke();
    }
    if (key === "front") {
      sunMark(ctx, w / 2, h * 0.5, w * 0.16, "#FFEDD7");
      label(ctx, "PRINTED · CMYK", w / 2, h * 0.72, w * 0.05, "#FFEDD7");
    }
    if (key === "top") sunMark(ctx, w / 2, h * 0.58, w * 0.14, "#FFEDD7");
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Sticker roll: a cream liner carrying a row of logo labels (wraps around the roll). Call after brandMarkReady(). */
export function stickerStripCanvas(labels = 10) {
  const W = 2048, H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  grainFill(ctx, W, H, "#F4EADB", 5);
  const step = W / labels;
  for (let i = 0; i < labels; i++) {
    const x = i * step + step * 0.08, w = step * 0.84, y = H * 0.14, h = H * 0.72;
    roundRect(ctx, x, y, w, h, h * 0.16);
    ctx.fillStyle = i % 2 ? "#2F357C" : "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!brandLogo(ctx, x + w / 2, y + h / 2, w * 0.82, i % 2 ? "dark" : "light")) sunMark(ctx, x + w / 2, y + h * 0.58, h * 0.16, "#EA5B32");
  }
  return c;
}

/** Sticker sheet: round logo stickers in the brand colours on a white backing sheet. Call after brandMarkReady(). */
export function stickerSheetCanvas() {
  const W = 1024, H = 1400;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  grainFill(ctx, W, H, "#FBF7F0", 4);
  const cols = 3, rows = 4, cw = W / cols, ch = H / rows, r = Math.min(cw, ch) * 0.4;
  const looks: [string, "mark" | "light" | "dark", string][] = [
    ["#EA5B32", "mark", "#FFEDD7"],
    ["#2F357C", "dark", ""],
    ["#C9A06B", "light", ""],
  ];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const [bg, kind, tint] = looks[(i + j) % looks.length];
      const cx = cw * (i + 0.5), cy = ch * (j + 0.5);
      // die-cut outline
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(20,20,30,0.12)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      if (kind === "mark") sunMark(ctx, cx, cy + r * 0.12, r * 0.42, tint);
      else brandLogo(ctx, cx, cy, r * 1.5, kind);
    }
  return c;
}

export function cupCanvas() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  grainFill(ctx, 1024, 512, "#F4EADB", 6);
  ctx.fillStyle = "#382416";
  ctx.fillRect(0, 0, 1024, 130);
  ctx.fillStyle = "#EA5B32";
  ctx.fillRect(0, 130, 1024, 12);
  for (const x of [256, 768]) sunMark(ctx, x, 330, 62, "#EA5B32");
  return c;
}

/** Flat blank drawn by the real packaging engine: kraft panels, red cuts, dashed creases. */
export function dielineSheetCanvas(engineKey: string, dims: Dimensions, px = 1400) {
  const d = getEngine(engineKey).dieline(dims);
  const k = px / Math.max(d.width, d.height);
  const c = document.createElement("canvas");
  c.width = Math.round(d.width * k);
  c.height = Math.round(d.height * k);
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  for (const p of d.panels) {
    ctx.beginPath();
    p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
    ctx.closePath();
    ctx.fillStyle = p.kind === "inner" ? "#B48655" : "#C29262";
    ctx.fill();
  }
  ctx.lineWidth = Math.max(2, k * 1.2);
  ctx.strokeStyle = "#8F2F05";
  ctx.beginPath();
  for (const [a, b] of d.cuts) {
    ctx.moveTo(a[0] * k, a[1] * k);
    ctx.lineTo(b[0] * k, b[1] * k);
  }
  ctx.stroke();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(16,9,4,0.55)";
  ctx.beginPath();
  for (const [a, b] of d.folds) {
    ctx.moveTo(a[0] * k, a[1] * k);
    ctx.lineTo(b[0] * k, b[1] * k);
  }
  ctx.stroke();
  const front = d.panels.find((p) => p.id === "front");
  if (front) sunMark(ctx, (front.rect.x + front.rect.w / 2) * k, (front.rect.y + front.rect.h * 0.55) * k, front.rect.h * k * 0.16, "#100904");
  return { canvas: c, widthMm: d.width, heightMm: d.height };
}

/** Self-healing cutting mat with a 1 cm grid. */
export function cuttingMatCanvas(w = 2048, h = 1365) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  grainFill(ctx, w, h, "#445231", 8);
  const step = w / 60;
  for (let i = 0, x = 0; x < w; i++, x += step) {
    ctx.strokeStyle = i % 5 === 0 ? "rgba(225,235,200,0.32)" : "rgba(225,235,200,0.12)";
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let i = 0, y = 0; y < h; i++, y += step) {
    ctx.strokeStyle = i % 5 === 0 ? "rgba(225,235,200,0.32)" : "rgba(225,235,200,0.12)";
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  return c;
}

/** Steel ruler face with millimetre ticks. */
export function rulerCanvas() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#d9d6cf");
  g.addColorStop(1, "#a9a59c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2048, 128);
  ctx.fillStyle = "#222";
  for (let i = 0; i <= 300; i++) {
    const x = 24 + i * 6.66;
    const len = i % 10 === 0 ? 46 : i % 5 === 0 ? 32 : 20;
    ctx.fillRect(x, 0, 2, len);
    if (i % 10 === 0) {
      ctx.font = "500 22px Inter, Arial";
      ctx.fillText(String(i / 10), x + 4, 76);
    }
  }
  return c;
}
