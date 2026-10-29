import type { ArtMapping, Dieline, DielinePanel, Dimensions, PanelKind, Pt, SurfaceSpec } from "./types";

const EPS = 0.01;

export function rectPanel(
  id: string,
  label: { ar: string; en: string },
  kind: PanelKind,
  x: number,
  y: number,
  w: number,
  h: number,
  art?: ArtMapping,
): DielinePanel {
  return {
    id,
    label,
    kind,
    rect: { x, y, w, h },
    points: [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    art,
  };
}

export function polyPanel(
  id: string,
  label: { ar: string; en: string },
  kind: PanelKind,
  points: Pt[],
  art?: ArtMapping,
): DielinePanel {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { id, label, kind, points, art, rect: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y } };
}

/** Trapezoid flap hanging off a horizontal hinge. dir = -1 → flap goes up, +1 → down. */
export function taperedFlap(x: number, y: number, w: number, depth: number, dir: 1 | -1, taper: number): Pt[] {
  const t = Math.min(taper, w / 3);
  const yy = y + dir * depth;
  return dir === -1
    ? [
        [x + t, yy],
        [x + w - t, yy],
        [x + w, y],
        [x, y],
      ]
    : [
        [x, y],
        [x + w, y],
        [x + w - t, yy],
        [x + t, yy],
      ];
}

/** Trapezoid flap hanging off a vertical hinge. dir = -1 → flap goes left, +1 → right. */
export function taperedSideFlap(x: number, y: number, h: number, depth: number, dir: 1 | -1, taper: number): Pt[] {
  const t = Math.min(taper, h / 3);
  const xx = x + dir * depth;
  return dir === -1
    ? [
        [xx, y + t],
        [x, y],
        [x, y + h],
        [xx, y + h - t],
      ]
    : [
        [x, y],
        [xx, y + t],
        [xx, y + h - t],
        [x, y + h],
      ];
}

type Interval = [number, number];

function subtractIntervals(base: Interval, cutters: Interval[]): Interval[] {
  let parts: Interval[] = [base];
  for (const [c0, c1] of cutters) {
    const next: Interval[] = [];
    for (const [a, b] of parts) {
      if (c1 <= a + EPS || c0 >= b - EPS) {
        next.push([a, b]);
        continue;
      }
      if (c0 > a + EPS) next.push([a, c0]);
      if (c1 < b - EPS) next.push([c1, b]);
    }
    parts = next;
  }
  return parts.filter(([a, b]) => b - a > EPS);
}

function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((p, q) => p[0] - q[0]);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv[0] <= last[1] + EPS) last[1] = Math.max(last[1], iv[1]);
    else out.push([iv[0], iv[1]]);
  }
  return out;
}

const key = (n: number) => Math.round(n * 100) / 100;

/**
 * Derive cut lines from panel outlines: every outline edge is a cut,
 * except where it lies on a declared fold (hinge). Collinear cuts are merged.
 */
export function deriveCuts(panels: DielinePanel[], folds: [Pt, Pt][]): [Pt, Pt][] {
  const horiz = new Map<number, Interval[]>();
  const vert = new Map<number, Interval[]>();
  const diagonal: [Pt, Pt][] = [];

  const foldH = new Map<number, Interval[]>();
  const foldV = new Map<number, Interval[]>();
  for (const [a, b] of folds) {
    if (Math.abs(a[1] - b[1]) < EPS) {
      const k = key(a[1]);
      foldH.set(k, [...(foldH.get(k) ?? []), [Math.min(a[0], b[0]), Math.max(a[0], b[0])]]);
    } else if (Math.abs(a[0] - b[0]) < EPS) {
      const k = key(a[0]);
      foldV.set(k, [...(foldV.get(k) ?? []), [Math.min(a[1], b[1]), Math.max(a[1], b[1])]]);
    }
  }

  for (const p of panels) {
    for (let i = 0; i < p.points.length; i++) {
      const a = p.points[i];
      const b = p.points[(i + 1) % p.points.length];
      if (Math.abs(a[1] - b[1]) < EPS) {
        const k = key(a[1]);
        const pieces = subtractIntervals([Math.min(a[0], b[0]), Math.max(a[0], b[0])], foldH.get(k) ?? []);
        horiz.set(k, [...(horiz.get(k) ?? []), ...pieces]);
      } else if (Math.abs(a[0] - b[0]) < EPS) {
        const k = key(a[0]);
        const pieces = subtractIntervals([Math.min(a[1], b[1]), Math.max(a[1], b[1])], foldV.get(k) ?? []);
        vert.set(k, [...(vert.get(k) ?? []), ...pieces]);
      } else {
        diagonal.push([a, b]);
      }
    }
  }

  const cuts: [Pt, Pt][] = [];
  for (const [y, ivs] of horiz) for (const [x0, x1] of mergeIntervals(ivs)) cuts.push([[x0, y], [x1, y]]);
  for (const [x, ivs] of vert) for (const [y0, y1] of mergeIntervals(ivs)) cuts.push([[x, y0], [x, y1]]);
  return [...cuts, ...diagonal];
}

/** Shift everything so the dieline's bounding box starts at (0, 0). */
export function finalizeDieline(panels: DielinePanel[], folds: [Pt, Pt][]): Dieline {
  const xs = panels.flatMap((p) => p.points.map((q) => q[0]));
  const ys = panels.flatMap((p) => p.points.map((q) => q[1]));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const shift = (q: Pt): Pt => [q[0] - minX, q[1] - minY];
  const moved = panels.map((p) => ({
    ...p,
    points: p.points.map(shift),
    rect: { ...p.rect, x: p.rect.x - minX, y: p.rect.y - minY },
    art: p.art?.fan ? { ...p.art, fan: { ...p.art.fan, cx: p.art.fan.cx - minX, cy: p.art.fan.cy - minY } } : p.art,
  }));
  const movedFolds = folds.map(([a, b]) => [shift(a), shift(b)] as [Pt, Pt]);
  return {
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
    panels: moved,
    folds: movedFolds,
    cuts: deriveCuts(moved, movedFolds),
  };
}

export const SURFACE_LABELS = {
  front: { ar: "الوجه الأمامي", en: "Front" },
  back: { ar: "الوجه الخلفي", en: "Back" },
  left: { ar: "الجانب الأيسر", en: "Left side" },
  right: { ar: "الجانب الأيمن", en: "Right side" },
  top: { ar: "الوجه العلوي", en: "Top" },
  bottom: { ar: "القاعدة", en: "Bottom" },
} as const;

/** The six outer faces of a rectangular box. */
export function boxSurfaces(d: Dimensions, overrides: Partial<Record<keyof typeof SURFACE_LABELS, { ar: string; en: string }>> = {}): SurfaceSpec[] {
  const { length: L, width: W, height: H } = d;
  const lbl = (k: keyof typeof SURFACE_LABELS) => overrides[k] ?? SURFACE_LABELS[k];
  return [
    { key: "front", label: lbl("front"), w: L, h: H },
    { key: "back", label: lbl("back"), w: L, h: H },
    { key: "left", label: lbl("left"), w: W, h: H },
    { key: "right", label: lbl("right"), w: W, h: H },
    { key: "top", label: lbl("top"), w: L, h: W },
    { key: "bottom", label: lbl("bottom"), w: L, h: W },
  ];
}
