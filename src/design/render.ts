"use client";

import type { DesignDocument, DesignElement, SurfaceDoc, TextElement } from "./document";
import { STUDIO_FONTS } from "./fonts";
import type { Dieline, Dimensions, SurfaceKey, SurfaceSpec } from "@/packaging/types";

/* ───────────────────────── Assets ───────────────────────── */

export const assetUrl = (id: string) => `/api/assets/${id}`;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(src);
        reject(new Error(`Failed to load ${src}`));
      };
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

export type ImageMap = Map<string, HTMLImageElement>;

/* ───────────────────────── Text ───────────────────────── */

const RTL_RE = /[֐-ࣿיִ-ﻼ]/;
export const isRtlText = (s: string) => {
  const m = s.match(/[A-Za-z֐-ࣿיִ-ﻼ]/);
  return !!m && RTL_RE.test(m[0]);
};

const LINE_HEIGHT = 1.3;
const PAD = 0.12; // fraction of font size

const fontString = (el: Pick<TextElement, "bold" | "font">, px: number) => `${el.bold ? 700 : 400} ${px}px ${STUDIO_FONTS[el.font].family}`;

let measureCtx: CanvasRenderingContext2D | null = null;

/** Natural box size (mm) of a text element for its content and font. */
export function measureText(el: Pick<TextElement, "text" | "font" | "bold" | "fontSizeMm">): { width: number; height: number } {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCtx!;
  const px = 100;
  ctx.font = fontString(el, px);
  const lines = (el.text || " ").split("\n");
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l || " ").width));
  const k = el.fontSizeMm / px;
  return { width: maxW * k + el.fontSizeMm * PAD * 2, height: lines.length * el.fontSizeMm * LINE_HEIGHT + el.fontSizeMm * PAD * 2 };
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement, s: number) {
  const px = el.fontSizeMm * s;
  const w = el.width * s;
  const h = el.height * s;
  const lines = (el.text || "").split("\n");
  const rtl = isRtlText(el.text);
  ctx.font = fontString(el, px);
  ctx.fillStyle = el.color;
  ctx.textBaseline = "middle";
  ctx.direction = rtl ? "rtl" : "ltr";
  const pad = px * PAD;
  const startX = rtl ? w / 2 - pad : -w / 2 + pad;
  const endX = rtl ? -w / 2 + pad : w / 2 - pad;
  ctx.textAlign = el.align === "center" ? "center" : el.align === "start" ? (rtl ? "right" : "left") : rtl ? "left" : "right";
  const x = el.align === "center" ? 0 : el.align === "start" ? startX : endX;
  const blockH = lines.length * px * LINE_HEIGHT;
  lines.forEach((line, i) => ctx.fillText(line, x, -blockH / 2 + px * LINE_HEIGHT * (i + 0.5), Math.max(1, w)));
  void h;
}

/* ───────────────────────── Elements & surfaces ───────────────────────── */

export function drawElement(ctx: CanvasRenderingContext2D, el: DesignElement, s: number, images: ImageMap) {
  ctx.save();
  ctx.translate(el.x * s, el.y * s);
  ctx.rotate((el.rotation * Math.PI) / 180);
  if (el.type === "image") {
    const img = images.get(el.assetId);
    if (img) ctx.drawImage(img, (-el.width / 2) * s, (-el.height / 2) * s, el.width * s, el.height * s);
  } else {
    drawText(ctx, el, s);
  }
  ctx.restore();
}

/** Deterministic paper/board texture so kraft and corrugated read as board, not flat colour. */
let grainCanvas: HTMLCanvasElement | null = null;
function grain(): HTMLCanvasElement {
  if (grainCanvas) return grainCanvas;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(128, 128);
  let seed = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = (seed % 255) | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 18;
  }
  ctx.putImageData(img, 0, 0);
  grainCanvas = c;
  return c;
}

export interface SurfaceRenderOpts {
  materialColor: string;
  textured?: boolean;
  images: ImageMap;
}

export function drawSurface(ctx: CanvasRenderingContext2D, spec: { w: number; h: number }, surface: SurfaceDoc, s: number, opts: SurfaceRenderOpts) {
  ctx.save();
  ctx.fillStyle = surface.background ?? opts.materialColor;
  ctx.fillRect(0, 0, spec.w * s, spec.h * s);
  if (opts.textured) {
    const pattern = ctx.createPattern(grain(), "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, spec.w * s, spec.h * s);
    }
  }
  ctx.beginPath();
  ctx.rect(0, 0, spec.w * s, spec.h * s);
  ctx.clip();
  for (const el of surface.elements) drawElement(ctx, el, s, opts.images);
  ctx.restore();
}

/** Render every surface to its own canvas. maxPx caps the longest side (texture memory). */
export function renderSurfaceCanvases(
  doc: DesignDocument,
  specs: SurfaceSpec[],
  opts: SurfaceRenderOpts & { maxPx?: number },
  reuse?: Partial<Record<SurfaceKey, HTMLCanvasElement>>,
): Record<SurfaceKey, HTMLCanvasElement> {
  const maxPx = opts.maxPx ?? 1024;
  const out = {} as Record<SurfaceKey, HTMLCanvasElement>;
  for (const spec of specs) {
    const s = Math.min(maxPx / Math.max(spec.w, spec.h), 8);
    const canvas = reuse?.[spec.key] ?? document.createElement("canvas");
    const cw = Math.max(2, Math.round(spec.w * s));
    const ch = Math.max(2, Math.round(spec.h * s));
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    drawSurface(ctx, spec, doc.surfaces[spec.key], s, opts);
    out[spec.key] = canvas;
  }
  return out;
}

/* ───────────────────────── Dieline composite ───────────────────────── */

export function drawDieline(
  ctx: CanvasRenderingContext2D,
  dieline: Dieline,
  specs: SurfaceSpec[],
  surfaceCanvases: Record<SurfaceKey, HTMLCanvasElement>,
  opts: { scale: number; materialColor: string; showArt: boolean; showLabels: boolean; locale: "ar" | "en" },
) {
  const s = opts.scale;
  for (const p of dieline.panels) {
    ctx.save();
    ctx.beginPath();
    p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
    ctx.closePath();
    ctx.fillStyle = opts.materialColor;
    ctx.fill();
    if (p.kind === "glue") {
      ctx.fillStyle = "rgba(20,40,63,0.10)";
      ctx.fill();
    }
    if (p.kind === "inner") {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fill();
    }
    if (opts.showArt && p.art) {
      ctx.clip();
      const src = surfaceCanvases[p.art.surface];
      const spec = specs.find((x) => x.key === p.art!.surface)!;
      const k = src.width / spec.w;
      const { rect } = p;
      const swapped = p.art.rotation === 90 || p.art.rotation === 270;
      const dw = (swapped ? rect.h : rect.w) * s;
      const dh = (swapped ? rect.w : rect.h) * s;
      ctx.translate((rect.x + rect.w / 2) * s, (rect.y + rect.h / 2) * s);
      ctx.rotate((p.art.rotation * Math.PI) / 180);
      ctx.drawImage(src, p.art.sx * k, p.art.sy * k, p.art.sw * k, p.art.sh * k, -dw / 2, -dh / 2, dw, dh);
    }
    ctx.restore();
  }
  ctx.save();
  ctx.lineWidth = Math.max(1, s * 0.4);
  ctx.strokeStyle = "#d62828";
  ctx.beginPath();
  for (const [a, b] of dieline.cuts) {
    ctx.moveTo(a[0] * s, a[1] * s);
    ctx.lineTo(b[0] * s, b[1] * s);
  }
  ctx.stroke();
  ctx.strokeStyle = "#1d6fd6";
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  for (const [a, b] of dieline.folds) {
    ctx.moveTo(a[0] * s, a[1] * s);
    ctx.lineTo(b[0] * s, b[1] * s);
  }
  ctx.stroke();
  ctx.restore();
  if (opts.showLabels) {
    ctx.save();
    ctx.fillStyle = "rgba(20,40,63,0.55)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of dieline.panels) {
      if (p.art || p.kind === "glue") continue;
      const size = Math.max(9, Math.min(p.rect.w, p.rect.h) * s * 0.14);
      ctx.font = `500 ${Math.min(size, 14)}px ${STUDIO_FONTS.plexArabic.family}`;
      ctx.fillText(p.label[opts.locale], (p.rect.x + p.rect.w / 2) * s, (p.rect.y + p.rect.h / 2) * s);
    }
    ctx.restore();
  }
}

/* ───────────────────────── Isometric thumbnail (no WebGL needed) ───────────────────────── */

export function renderIsoThumbnail(
  dims: Dimensions,
  canvases: Record<SurfaceKey, HTMLCanvasElement>,
  opts: { width?: number; height?: number; background?: string } = {},
): HTMLCanvasElement {
  const W = opts.width ?? 640;
  const H = opts.height ?? 480;
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = opts.background ?? "#F8F6F2";
  ctx.fillRect(0, 0, W, H);

  const { length: L, width: Wd, height: Ht } = dims;
  const c = Math.cos(Math.PI / 6);
  const sn = 0.5;
  const P = (x: number, y: number, z: number): [number, number] => [x * c - z * c, x * sn + z * sn - y];
  const corners = [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((k) => P((i * L) / 2, (j * Ht) / 2, (k * Wd) / 2))));
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  const k = Math.min((W * 0.78) / bw, (H * 0.72) / bh);
  const ox = W / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * k;
  const oy = H / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * k + H * 0.02;

  // soft ground shadow
  const g = ctx.createRadialGradient(W / 2, oy + (Math.max(...ys) * k) * 0.98, 4, W / 2, oy + Math.max(...ys) * k, bw * k * 0.55);
  g.addColorStop(0, "rgba(20,40,63,0.22)");
  g.addColorStop(1, "rgba(20,40,63,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const face = (src: HTMLCanvasElement, origin: [number, number], uVec: [number, number], vVec: [number, number], shade: number) => {
    ctx.save();
    ctx.setTransform((uVec[0] * k) / src.width, (uVec[1] * k) / src.width, (vVec[0] * k) / src.height, (vVec[1] * k) / src.height, ox + origin[0] * k, oy + origin[1] * k);
    ctx.drawImage(src, 0, 0);
    if (shade !== 0) {
      ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(10,20,35,${-shade})`;
      ctx.fillRect(0, 0, src.width, src.height);
    }
    ctx.strokeStyle = "rgba(20,40,63,0.35)";
    ctx.lineWidth = Math.max(src.width, src.height) / 300;
    ctx.strokeRect(0, 0, src.width, src.height);
    ctx.restore();
  };
  const sub = (a: [number, number], b: [number, number]): [number, number] => [a[0] - b[0], a[1] - b[1]];

  const fTL = P(-L / 2, Ht / 2, Wd / 2);
  face(canvases.front, fTL, sub(P(L / 2, Ht / 2, Wd / 2), fTL), sub(P(-L / 2, -Ht / 2, Wd / 2), fTL), 0);
  const rTL = P(L / 2, Ht / 2, Wd / 2);
  face(canvases.right, rTL, sub(P(L / 2, Ht / 2, -Wd / 2), rTL), sub(P(L / 2, -Ht / 2, Wd / 2), rTL), -0.16);
  const tTL = P(-L / 2, Ht / 2, -Wd / 2);
  face(canvases.top, tTL, sub(P(L / 2, Ht / 2, -Wd / 2), tTL), sub(P(-L / 2, Ht / 2, Wd / 2), tTL), 0.1);
  return out;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
