"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getEngine } from "@/packaging/engine";
import type { Dieline, Dimensions } from "@/packaging/types";
import { brandLogo, sunMark } from "@/components/three/showcase";
import { clamp, timeline } from "./scroll";
import { cartonAt, dimsAt, foldAt, linesAt, printAt, spinAt } from "./story";

/**
 * Regular slotted carton assembled from the packaging engine's own dieline.
 * Each panel is a node hinged on its neighbour, so the same object is both the
 * flat blank (fold = 0) and the closed box (fold = 1).
 */

export { MM } from "./story";
import { MM } from "./story";
// Fixed sheet size: GPU textures keep their first allocated size, so the canvas must never resize.
// Everything is drawn in millimetres under a (possibly non-uniform) scale; panel UVs undo it exactly.
const SHEET_W = 2048;
const SHEET_H = 1024;

const engine = getEngine("rsc");

type PanelId = "glue" | "front" | "right" | "back" | "left" | `top-${"front" | "right" | "back" | "left"}` | `bottom-${"front" | "right" | "back" | "left"}`;

/* ───────────── sheet painting (one canvas per layer, shared by every panel) ───────────── */

let grainTile: HTMLCanvasElement | null = null;
function grain() {
  if (grainTile) return grainTile;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(128, 128);
  let seed = 3;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = seed % 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 22;
  }
  ctx.putImageData(img, 0, 0);
  return (grainTile = c);
}

function panelPath(ctx: CanvasRenderingContext2D, d: Dieline, id: string) {
  const p = d.panels.find((x) => x.id === id);
  if (!p) return null;
  ctx.beginPath();
  p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  return p;
}

function createSheet() {
  const c = document.createElement("canvas");
  c.width = SHEET_W;
  c.height = SHEET_H;
  return c;
}

function paintSheet(canvas: HTMLCanvasElement, d: Dieline, mode: "kraft" | "print" | "lines") {
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, SHEET_W, SHEET_H);
  ctx.setTransform(SHEET_W / d.width, 0, 0, SHEET_H / d.height, 0, 0); // mm → px

  if (mode === "lines") {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#E0301E";
    ctx.beginPath();
    for (const [a, b] of d.cuts) {
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = "#FFEDD7";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const [a, b] of d.folds) {
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  for (const p of d.panels) {
    panelPath(ctx, d, p.id);
    if (mode === "kraft") {
      ctx.fillStyle = p.kind === "inner" ? "#B2834F" : "#BE8E5B";
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // grain in pixel space, so it never stretches
      ctx.fillStyle = ctx.createPattern(grain(), "repeat")!;
      ctx.fillRect(0, 0, SHEET_W, SHEET_H);
      ctx.restore();
    } else {
      const g = ctx.createLinearGradient(p.rect.x, p.rect.y, p.rect.x + p.rect.w, p.rect.y + p.rect.h);
      g.addColorStop(0, "#E2560A");
      g.addColorStop(0.6, "#9A3307");
      g.addColorStop(1, "#3B2214");
      ctx.fillStyle = p.kind === "inner" || p.kind === "glue" ? "#3B2214" : g;
      ctx.fill();
    }
  }

  // artwork on the faces (millimetres)
  const ink = mode === "kraft" ? "#120A05" : "#FFEDD7";
  for (const id of ["front", "back"]) {
    const p = d.panels.find((x) => x.id === id)!;
    const cx = p.rect.x + p.rect.w / 2;
    const cy = p.rect.y + p.rect.h * 0.5;
    const r = Math.min(p.rect.w, p.rect.h) * 0.15;
    // drawn in millimetres (like the rest of the sheet) so the panel UVs show it with true proportions
    const placed = brandLogo(ctx, cx, cy, p.rect.w * 0.62, mode === "kraft" ? "light" : "dark");
    if (!placed) {
      sunMark(ctx, cx, cy, r, ink);
      ctx.fillStyle = ink;
      ctx.font = `500 ${r * 0.62}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SUNRISE LIGHT", cx, cy + r * 0.95);
    }
  }
  for (const id of ["right", "left"]) {
    const p = d.panels.find((x) => x.id === id)!;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2, p.rect.w * 0.02);
    ctx.lineCap = "round";
    for (const dx of [-0.12, 0.12]) {
      const x = p.rect.x + p.rect.w * (0.5 + dx);
      const y0 = p.rect.y + p.rect.h * 0.34;
      const y1 = p.rect.y + p.rect.h * 0.16;
      const a = p.rect.w * 0.05;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.moveTo(x - a, y1 + a);
      ctx.lineTo(x, y1);
      ctx.lineTo(x + a, y1 + a);
      ctx.stroke();
    }
  }
  // tape across the closed top: drawn on the two major top flaps
  for (const id of ["top-front", "top-back"]) {
    const p = d.panels.find((x) => x.id === id)!;
    ctx.fillStyle = mode === "kraft" ? "rgba(18,10,5,0.5)" : "rgba(255,237,215,0.85)";
    ctx.fillRect(p.rect.x + p.rect.w * 0.45, p.rect.y, p.rect.w * 0.1, p.rect.h);
  }
  if (mode === "print") {
    ctx.strokeStyle = "rgba(255,237,215,0.18)";
    ctx.lineWidth = 1;
    for (let i = -d.height; i < d.width; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, d.height);
      ctx.lineTo(i + d.height, 0);
      ctx.stroke();
    }
    // keep only panel areas — one combined path, one fill (each destination-in fill would erase the others)
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    for (const p of d.panels) {
      p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    }
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
}

/* ───────────── geometry helpers ───────────── */

function setPanelUV(geo: THREE.PlaneGeometry, d: Dieline, id: string) {
  const p = d.panels.find((x) => x.id === id)!;
  const { x, y, w, h } = p.rect;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // PlaneGeometry vertex order: top-left, top-right, bottom-left, bottom-right
  const corners: [number, number][] = [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ];
  corners.forEach(([cx, cy], i) => uv.setXY(i, cx / d.width, 1 - cy / d.height));
  uv.needsUpdate = true;
}

interface PanelLayerRefs {
  group: THREE.Group;
  mesh: THREE.Group;
}

function makeTexture(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ───────────── component ───────────── */

const IDS: PanelId[] = ["glue", "front", "right", "back", "left", "top-front", "top-right", "top-back", "top-left", "bottom-front", "bottom-right", "bottom-back", "bottom-left"];

export function FoldingCarton({ children }: { children?: React.ReactNode }) {
  const root = useRef<THREE.Group>(null);
  const centre = useRef<THREE.Group>(null);
  const nodes = useRef<Partial<Record<PanelId, PanelLayerRefs>>>({});
  const lastDims = useRef<string>("");

  const sheets = useMemo(() => {
    const kraft = createSheet();
    const print = createSheet();
    const lines = createSheet();
    return { kraft, print, lines, tKraft: makeTexture(kraft), tPrint: makeTexture(print), tLines: makeTexture(lines) };
  }, []);

  const mats = useMemo(
    () => ({
      outer: new THREE.MeshStandardMaterial({ map: sheets.tKraft, roughness: 0.88, alphaTest: 0.5, side: THREE.FrontSide }),
      inner: new THREE.MeshStandardMaterial({ map: sheets.tKraft, color: "#8a6a48", roughness: 0.95, alphaTest: 0.5, side: THREE.BackSide }),
      print: new THREE.MeshStandardMaterial({ map: sheets.tPrint, roughness: 0.55, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -1, depthWrite: false }),
      lines: new THREE.MeshBasicMaterial({ map: sheets.tLines, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }),
    }),
    [sheets],
  );

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      [sheets.tKraft, sheets.tPrint, sheets.tLines].forEach((t) => t.dispose());
    },
    [mats, sheets],
  );

  // one geometry per panel, shared by its four layers so a single UV update covers them all
  const geos = useMemo(() => Object.fromEntries(IDS.map((id) => [id, new THREE.PlaneGeometry(1, 1)])) as Record<PanelId, THREE.PlaneGeometry>, []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const register = (id: PanelId) => (g: THREE.Group | null) => {
    if (!g) return;
    nodes.current[id] = { group: g, mesh: g.getObjectByName("panel") as THREE.Group };
  };

  useFrame(() => {
    const s = timeline.screens;
    const dims = dimsAt(s);
    const key = `${dims.length}x${dims.width}x${dims.height}`;
    const d = engine.dieline(dims);

    // repaint sheets and UVs only when the dimensions actually change
    if (key !== lastDims.current) {
      lastDims.current = key;
      paintSheet(sheets.kraft, d, "kraft");
      paintSheet(sheets.print, d, "print");
      paintSheet(sheets.lines, d, "lines");
      sheets.tKraft.needsUpdate = sheets.tPrint.needsUpdate = sheets.tLines.needsUpdate = true;
      for (const id of IDS) {
        setPanelUV(geos[id], d, id);
      }
    }

    layout(dims, d, foldAt(s));
    mats.print.opacity = printAt(s);
    mats.lines.opacity = linesAt(s);

    if (root.current) {
      const F = foldAt(s);
      root.current.rotation.set(-Math.PI / 2 * (1 - F), spinAt(s), 0);
      // step aside when another chapter has the stage
      const presence = cartonAt(s);
      root.current.visible = presence > 0.01;
      root.current.scale.setScalar(Math.max(0.001, presence));
    }
  });

  function layout(dims: Dimensions, d: Dieline, F: number) {
    const L = dims.length * MM;
    const W = dims.width * MM;
    const H = dims.height * MM;
    const g = (d.panels.find((p) => p.id === "glue")!.rect.w) * MM;
    const f = W / 2;
    const body = clamp(F / 0.6) * (Math.PI / 2);
    const minor = clamp((F - 0.55) / 0.25) * (Math.PI / 2);
    const major = clamp((F - 0.75) / 0.25) * (Math.PI / 2);

    const set = (id: PanelId, pos: [number, number, number], rot: [number, number, number], meshPos: [number, number], w: number, h: number) => {
      const n = nodes.current[id];
      if (!n) return;
      n.group.position.set(...pos);
      n.group.rotation.set(...rot);
      n.mesh.position.set(meshPos[0], meshPos[1], 0);
      n.mesh.scale.set(w, h, 1);
    };

    set("front", [0, 0, 0], [0, 0, 0], [L / 2, H / 2], L, H);
    set("glue", [0, 0, 0], [0, -body, 0], [-g / 2, H / 2], g, H);
    set("right", [L, 0, 0], [0, body, 0], [W / 2, H / 2], W, H);
    set("back", [W, 0, 0], [0, body, 0], [L / 2, H / 2], L, H);
    set("left", [L, 0, 0], [0, body, 0], [W / 2, H / 2], W, H);

    const widths = { front: L, right: W, back: L, left: W } as const;
    for (const side of ["front", "right", "back", "left"] as const) {
      const isMajor = side === "front" || side === "back";
      const a = isMajor ? major : minor;
      // minor flaps sit just below the majors once closed
      const inset = isMajor ? 0 : 0.004;
      set(`top-${side}`, [0, H - inset, 0], [-a, 0, 0], [widths[side] / 2, f / 2], widths[side], f);
      set(`bottom-${side}`, [0, inset, 0], [a, 0, 0], [widths[side] / 2, -f / 2], widths[side], f);
    }

    // centre: closed box around the origin, flat blank centred on the sheet
    const folded = new THREE.Vector3(L / 2, H / 2, -W / 2);
    const flat = new THREE.Vector3((-g + 2 * L + 2 * W) / 2, H / 2, 0);
    const c = flat.lerp(folded, F);
    centre.current?.position.set(-c.x, -c.y, -c.z);
  }

  const Panel = ({ id, children }: { id: PanelId; children?: React.ReactNode }) => (
    <group ref={register(id)}>
      <group name="panel">
        <mesh castShadow receiveShadow material={mats.outer} geometry={geos[id]} />
        <mesh material={mats.inner} geometry={geos[id]} />
        <mesh material={mats.print} geometry={geos[id]} />
        <mesh material={mats.lines} geometry={geos[id]} />
      </group>
      {children}
    </group>
  );

  return (
    <group ref={root}>
      {/* attachments (e.g. dimension lines) rotate with the box, centred on it */}
      {children}
      <group ref={centre}>
        <Panel id="front">
          <Panel id="glue" />
          <Panel id="top-front" />
          <Panel id="bottom-front" />
          <Panel id="right">
            <Panel id="top-right" />
            <Panel id="bottom-right" />
            <Panel id="back">
              <Panel id="top-back" />
              <Panel id="bottom-back" />
              <Panel id="left">
                <Panel id="top-left" />
                <Panel id="bottom-left" />
              </Panel>
            </Panel>
          </Panel>
        </Panel>
      </group>
    </group>
  );
}
