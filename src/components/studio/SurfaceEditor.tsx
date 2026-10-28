"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Layer, Line, Rect, Shape, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import type { DesignElement, SurfaceDoc } from "@/design/document";
import { isOutsideSafeArea } from "@/design/document";
import { drawElement, type ImageMap } from "@/design/render";
import type { SurfaceSpec } from "@/packaging/types";

export interface SurfaceEditorProps {
  spec: SurfaceSpec;
  surface: SurfaceDoc;
  materialColor: string;
  safeMargin: number;
  images: ImageMap;
  imagesVersion: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<DesignElement>, coalesceKey?: string) => void;
  snap: boolean;
  zoom: number;
  onZoom: (z: number) => void;
  labels: { safe: string; edge: string };
  readOnly?: boolean;
}

const GRID_MM = 5;
const CENTER_SNAP_MM = 2;

export default function SurfaceEditor(p: SurfaceEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const trRef = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Shape>());
  const stageRef = useRef<Konva.Stage>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = 48;
  const fit = Math.min((size.w - pad * 2) / p.spec.w, (size.h - pad * 2) / p.spec.h);
  const s = Math.max(0.05, fit * p.zoom);
  const ox = (size.w - p.spec.w * s) / 2;
  const oy = (size.h - p.spec.h * s) / 2;

  // Reset pan when the surface or zoom level changes
  useEffect(() => {
    stageRef.current?.position({ x: 0, y: 0 });
  }, [p.spec.key, p.zoom]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = p.selectedId ? nodes.current.get(p.selectedId) : undefined;
    const el = p.surface.elements.find((e) => e.id === p.selectedId);
    tr.nodes(node && !el?.locked && !p.readOnly ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [p.selectedId, p.surface.elements, p.readOnly, s]);

  const gridLines = useMemo(() => {
    if (!p.snap) return [];
    const out: number[][] = [];
    for (let x = GRID_MM; x < p.spec.w; x += GRID_MM) out.push([x * s, 0, x * s, p.spec.h * s]);
    for (let y = GRID_MM; y < p.spec.h; y += GRID_MM) out.push([0, y * s, p.spec.w * s, y * s]);
    return out;
  }, [p.snap, p.spec.w, p.spec.h, s]);

  const selected = p.surface.elements.find((e) => e.id === p.selectedId);
  const selectedOutside = selected ? isOutsideSafeArea(selected, p.spec, p.safeMargin) : false;

  function snapPos(xmm: number, ymm: number) {
    let x = xmm;
    let y = ymm;
    if (p.snap) {
      x = Math.round(x / GRID_MM) * GRID_MM;
      y = Math.round(y / GRID_MM) * GRID_MM;
    }
    if (Math.abs(xmm - p.spec.w / 2) < CENTER_SNAP_MM) x = p.spec.w / 2;
    if (Math.abs(ymm - p.spec.h / 2) < CENTER_SNAP_MM) y = p.spec.h / 2;
    return { x, y };
  }

  function onWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const next = Math.min(6, Math.max(0.3, p.zoom * (e.evt.deltaY > 0 ? 0.9 : 1.1)));
    p.onZoom(next);
  }

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none">
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        draggable={p.zoom > 1}
        onWheel={onWheel}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage() || e.target.name() === "surface-bg") p.onSelect(null);
        }}
        onTouchStart={(e) => {
          if (e.target === e.target.getStage() || e.target.name() === "surface-bg") p.onSelect(null);
        }}
      >
        <Layer>
          <Group x={ox} y={oy}>
            {/* board */}
            <Rect name="surface-bg" width={p.spec.w * s} height={p.spec.h * s} fill={p.surface.background ?? p.materialColor} shadowColor="#000000" shadowOpacity={0.6} shadowBlur={30} shadowOffsetY={10} />
            {gridLines.map((pts, i) => (
              <Line key={i} points={pts} stroke="#FFEDD7" opacity={0.08} strokeWidth={1} listening={false} />
            ))}
            {/* artwork (clipped to the printable surface) */}
            <Group clipX={0} clipY={0} clipWidth={p.spec.w * s} clipHeight={p.spec.h * s}>
              {p.surface.elements.map((el) => (
                <Shape
                  key={el.id}
                  ref={(n) => {
                    if (n) nodes.current.set(el.id, n);
                    else nodes.current.delete(el.id);
                  }}
                  x={el.x * s}
                  y={el.y * s}
                  width={el.width * s}
                  height={el.height * s}
                  offsetX={(el.width * s) / 2}
                  offsetY={(el.height * s) / 2}
                  rotation={el.rotation}
                  draggable={!el.locked && !p.readOnly}
                  // re-render when images finish loading
                  imagesVersion={p.imagesVersion}
                  sceneFunc={(ctx, shape) => {
                    const native = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
                    native.save();
                    native.translate((el.width * s) / 2 - el.x * s, (el.height * s) / 2 - el.y * s);
                    drawElement(native, { ...el, rotation: 0 }, s, p.images);
                    native.restore();
                    void shape;
                  }}
                  hitFunc={(ctx, shape) => {
                    ctx.beginPath();
                    ctx.rect(0, 0, el.width * s, el.height * s);
                    ctx.closePath();
                    ctx.fillStrokeShape(shape);
                  }}
                  onMouseDown={() => p.onSelect(el.id)}
                  onTap={() => p.onSelect(el.id)}
                  onDragMove={(e) => {
                    const n = e.target;
                    const { x, y } = snapPos(n.x() / s, n.y() / s);
                    n.position({ x: x * s, y: y * s });
                  }}
                  onDragEnd={(e) => p.onChange(el.id, { x: e.target.x() / s, y: e.target.y() / s })}
                  onTransformEnd={(e) => {
                    const n = e.target;
                    const k = Math.abs(n.scaleX());
                    n.scaleX(1);
                    n.scaleY(1);
                    const patch: Partial<DesignElement> = {
                      x: n.x() / s,
                      y: n.y() / s,
                      width: Math.max(1, el.width * k),
                      height: Math.max(1, el.height * k),
                      rotation: Math.round(n.rotation() * 10) / 10,
                    };
                    if (el.type === "text") (patch as Partial<typeof el>).fontSizeMm = Math.max(1, el.fontSizeMm * k);
                    p.onChange(el.id, patch);
                  }}
                />
              ))}
            </Group>
            {/* safe area + edge */}
            <Rect x={p.safeMargin * s} y={p.safeMargin * s} width={(p.spec.w - p.safeMargin * 2) * s} height={(p.spec.h - p.safeMargin * 2) * s} stroke="#DC5000" strokeWidth={1} dash={[6, 5]} listening={false} />
            <Rect width={p.spec.w * s} height={p.spec.h * s} stroke="#1d6fd6" strokeWidth={1.2} dash={[10, 6]} listening={false} />
            {/* centre guides */}
            <Line points={[(p.spec.w / 2) * s, -8, (p.spec.w / 2) * s, 0]} stroke="#FFEDD7" opacity={0.5} listening={false} />
            <Line points={[-8, (p.spec.h / 2) * s, 0, (p.spec.h / 2) * s]} stroke="#FFEDD7" opacity={0.5} listening={false} />
          </Group>
          <Transformer
            ref={trRef}
            keepRatio
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            rotationSnapTolerance={4}
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
            anchorSize={10}
            anchorCornerRadius={5}
            anchorStroke={selectedOutside ? "#ff7b6b" : "#FFEDD7"}
            borderStroke={selectedOutside ? "#ff7b6b" : "#DC5000"}
            borderStrokeWidth={1.5}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 8 || newBox.height < 8 ? oldBox : newBox)}
          />
        </Layer>
      </Stage>
    </div>
  );
}
