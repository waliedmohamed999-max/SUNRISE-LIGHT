"use client";

import { useEffect, useRef, useState } from "react";
import { drawDieline } from "@/design/render";
import type { Dieline, SurfaceKey, SurfaceSpec } from "@/packaging/types";

export default function DielineView({
  dieline,
  specs,
  canvases,
  version,
  materialColor,
  locale,
  zoom,
}: {
  dieline: Dieline;
  specs: SurfaceSpec[];
  canvases: Record<SurfaceKey, HTMLCanvasElement> | null;
  version: number;
  materialColor: string;
  locale: "ar" | "en";
  zoom: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !canvases) return;
    const dpr = window.devicePixelRatio || 1;
    const pad = 40;
    const s = Math.min((size.w - pad * 2) / dieline.width, (size.h - pad * 2 - 24) / dieline.height) * zoom;
    const cw = Math.max(size.w, dieline.width * s + pad * 2);
    const ch = Math.max(size.h, dieline.height * s + pad * 2 + 24);
    c.width = cw * dpr;
    c.height = ch * dpr;
    c.style.width = `${cw}px`;
    c.style.height = `${ch}px`;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const ox = (cw - dieline.width * s) / 2;
    const oy = (ch - dieline.height * s - 24) / 2;
    ctx.translate(ox, oy);
    drawDieline(ctx, dieline, specs, canvases, { scale: s, materialColor, showArt: true, showLabels: true, locale });
    ctx.fillStyle = "#616781";
    ctx.font = "500 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.direction = "ltr";
    ctx.fillText(`${Math.round(dieline.width)} × ${Math.round(dieline.height)} mm`, (dieline.width * s) / 2, dieline.height * s + 20);
  }, [dieline, specs, canvases, version, materialColor, locale, size, zoom]);

  return (
    <div ref={wrap} className="absolute inset-0 overflow-auto">
      <canvas ref={canvas} className="block" />
    </div>
  );
}
