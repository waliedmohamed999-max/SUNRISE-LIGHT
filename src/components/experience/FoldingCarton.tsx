"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getEngine } from "@/packaging/engine";
import type { Dieline, Dimensions } from "@/packaging/types";
import { brandLogo, sunMark } from "@/components/three/showcase";
import { clamp, timeline } from "./scroll";
import { openingCartonScale } from "./opening";
import { LID_SWAP, cartonAt, dimsAt, foldAt, linesAt, printAt, spinAt } from "./story";

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

function paintSheet(canvas: HTMLCanvasElement, d: Dieline, mode: "board" | "print" | "lines") {
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
    ctx.strokeStyle = "#1D2A44";
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
    ctx.fillStyle = p.kind === "inner" ? "#EDE8DF" : "#FBF9F5";
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // grain in pixel space, so it never stretches
    ctx.fillStyle = ctx.createPattern(grain(), "repeat")!;
    ctx.fillRect(0, 0, SHEET_W, SHEET_H);
    ctx.restore();
  }

  const panel = (id: string) => d.panels.find((x) => x.id === id)!;

  // printed stage: an ember band runs round the foot of the four walls
  if (mode === "print") {
    for (const id of ["glue", "front", "right", "back", "left"]) {
      const { rect } = panel(id);
      ctx.save();
      panelPath(ctx, d, id);
      ctx.clip();
      ctx.fillStyle = "#EA5B32";
      ctx.fillRect(rect.x, rect.y + rect.h * 0.88, rect.w, rect.h * 0.12);
      ctx.restore();
    }
  }

  // logo on the two large walls, in millimetres so the panel UVs show it with true proportions
  for (const id of ["front", "back"]) {
    const { rect } = panel(id);
    brandLogo(ctx, rect.x + rect.w / 2, rect.y + rect.h * (mode === "print" ? 0.44 : 0.5), Math.min(rect.w * 0.62, rect.h * 1.9), "light");
  }
  for (const id of ["right", "left"]) {
    const { rect } = panel(id);
    sunMark(ctx, rect.x + rect.w / 2, rect.y + rect.h * 0.5, Math.min(rect.w, rect.h) * 0.16, "#EA5B32");
  }

  // logo across the closed top: each major flap carries half of it, the far flap turned 180° as it folds
  const topWidth = Math.min(panel("top-front").rect.w * 0.62, panel("top-front").rect.h * 3.2);
  for (const [id, turn] of [["top-front", 0], ["top-back", Math.PI]] as const) {
    const { rect } = panel(id);
    const cx = rect.x + rect.w / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.translate(cx, rect.y);
    ctx.rotate(turn);
    brandLogo(ctx, 0, 0, topWidth, "light");
    ctx.restore();
    // the seam where the flaps meet
    ctx.fillStyle = "rgba(29,42,68,0.14)";
    ctx.fillRect(rect.x, rect.y, rect.w, 0.8);
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
    const board = createSheet();
    const print = createSheet();
    const lines = createSheet();
    return { board, print, lines, tBoard: makeTexture(board), tPrint: makeTexture(print), tLines: makeTexture(lines) };
  }, []);

  const mats = useMemo(
    () => ({
      // the scene's lights are warm; a little self-illumination keeps the board reading as white
      outer: new THREE.MeshStandardMaterial({ map: sheets.tBoard, emissive: "#ffffff", emissiveMap: sheets.tBoard, emissiveIntensity: 0.6, roughness: 0.62, alphaTest: 0.5, side: THREE.FrontSide }),
      inner: new THREE.MeshStandardMaterial({ map: sheets.tBoard, color: "#e4ded2", emissive: "#ffffff", emissiveIntensity: 0.5, roughness: 0.85, alphaTest: 0.5, side: THREE.BackSide }),
      print: new THREE.MeshStandardMaterial({ map: sheets.tPrint, emissive: "#ffffff", emissiveMap: sheets.tPrint, emissiveIntensity: 0.6, roughness: 0.5, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -1, depthWrite: false }),
      lines: new THREE.MeshBasicMaterial({ map: sheets.tLines, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }),
    }),
    [sheets],
  );

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      [sheets.tBoard, sheets.tPrint, sheets.tLines].forEach((t) => t.dispose());
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
      paintSheet(sheets.board, d, "board");
      paintSheet(sheets.print, d, "print");
      paintSheet(sheets.lines, d, "lines");
      sheets.tBoard.needsUpdate = sheets.tPrint.needsUpdate = sheets.tLines.needsUpdate = true;
      for (const id of IDS) {
        setPanelUV(geos[id], d, id);
      }
    }

    layout(dims, d, foldAt(s));
    // the pizza lid stands in for the top flaps during the opening
    for (const id of IDS) {
      if (id.startsWith("top-")) {
        const n = nodes.current[id];
        if (n) n.mesh.visible = s >= LID_SWAP;
      }
    }
    mats.print.opacity = printAt(s);
    mats.lines.opacity = linesAt(s);

    if (root.current) {
      const F = foldAt(s);
      root.current.rotation.set(-Math.PI / 2 * (1 - F), spinAt(s), 0);
      // step aside when another chapter has the stage
      const presence = cartonAt(s) * openingCartonScale();
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
