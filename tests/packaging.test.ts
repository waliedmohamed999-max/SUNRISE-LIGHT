import { describe, expect, it } from "vitest";
import { ENGINES, getEngine, hasErrors, validateDimensions } from "@/packaging/engine";
import { dielineToSvg } from "@/packaging/svg";
import type { Dimensions, Pt } from "@/packaging/types";

const LIMITS = { minLengthMm: 100, maxLengthMm: 1200, minWidthMm: 80, maxWidthMm: 800, minHeightMm: 50, maxHeightMm: 1000 };
const D: Dimensions = { length: 300, width: 200, height: 120 };
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const segLen = ([a, b]: [Pt, Pt]) => Math.hypot(b[0] - a[0], b[1] - a[1]);

describe("RSC shipping carton", () => {
  const e = getEngine("rsc");
  const d = e.dieline(D);

  it("has the expected blank size (glue + 2L + 2W) × (H + W)", () => {
    expect(close(d.width, 35 + 2 * 300 + 2 * 200)).toBe(true);
    expect(close(d.height, 120 + 200)).toBe(true);
  });

  it("face panels match surface sizes", () => {
    const specs = Object.fromEntries(e.surfaces(D).map((s) => [s.key, s]));
    for (const p of d.panels.filter((x) => x.kind === "face")) {
      const s = specs[p.art!.surface];
      expect(close(p.rect.w, s.w)).toBe(true);
      expect(close(p.rect.h, s.h)).toBe(true);
    }
  });

  it("top and bottom artwork is split exactly across the two major flaps", () => {
    for (const surface of ["top", "bottom"] as const) {
      const flaps = d.panels.filter((p) => p.art?.surface === surface);
      expect(flaps).toHaveLength(2);
      const covered = flaps.reduce((n, f) => n + f.art!.sh, 0);
      expect(close(covered, D.width)).toBe(true);
      expect(flaps.map((f) => f.art!.rotation).sort()).toEqual([0, 180]);
    }
  });

  it("generates folds on every body crease and no cut overlaps a fold", () => {
    expect(d.folds.length).toBe(6);
    for (const c of d.cuts) {
      for (const f of d.folds) {
        const horizontal = close(c[0][1], c[1][1]) && close(f[0][1], f[1][1]) && close(c[0][1], f[0][1]);
        if (!horizontal) continue;
        const overlap = Math.min(Math.max(c[0][0], c[1][0]), Math.max(f[0][0], f[1][0])) - Math.max(Math.min(c[0][0], c[1][0]), Math.min(f[0][0], f[1][0]));
        expect(overlap).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  it("dieline scales with dimensions", () => {
    const bigger = e.dieline({ length: 400, width: 200, height: 120 });
    expect(close(bigger.width - d.width, 200)).toBe(true);
  });
});

describe("all engines", () => {
  for (const engine of Object.values(ENGINES)) {
    it(`${engine.key}: every printable surface is mapped onto the dieline exactly once in area`, () => {
      const d = engine.dieline(D);
      for (const s of engine.surfaces(D)) {
        const area = d.panels.filter((p) => p.art?.surface === s.key).reduce((n, p) => n + p.art!.sw * p.art!.sh, 0);
        expect(close(area, s.w * s.h)).toBe(true);
      }
    });

    it(`${engine.key}: rotated panels swap width and height correctly`, () => {
      const d = engine.dieline(D);
      for (const p of d.panels.filter((x) => x.art)) {
        const swapped = p.art!.rotation === 90 || p.art!.rotation === 270;
        expect(close(swapped ? p.rect.w : p.rect.h, p.art!.sh)).toBe(true);
        expect(close(swapped ? p.rect.h : p.rect.w, p.art!.sw)).toBe(true);
      }
    });

    it(`${engine.key}: produces non-degenerate cut lines and a valid SVG`, () => {
      const d = engine.dieline(D);
      expect(d.cuts.length).toBeGreaterThan(4);
      expect(d.cuts.every((c) => segLen(c) > 0)).toBe(true);
      const svg = dielineToSvg(d, { locale: "ar" });
      expect(svg).toContain("<svg");
      expect(svg).toContain('id="cut"');
      expect(svg).toContain("مراجعة فنية");
    });
  }
});

describe("dimension validation", () => {
  const e = getEngine("rsc");
  it("accepts in-range dimensions", () => expect(hasErrors(validateDimensions(e, D, LIMITS))).toBe(false));
  it.each([
    [{ ...D, length: 0 }],
    [{ ...D, width: -10 }],
    [{ ...D, height: Number.NaN }],
    [{ ...D, length: 5000 }],
    [{ ...D, height: 10 }],
  ])("rejects %o", (d) => expect(hasErrors(validateDimensions(e, d, LIMITS))).toBe(true));
  it("warns (not errors) when width exceeds length", () => {
    const issues = validateDimensions(e, { length: 200, width: 300, height: 120 }, LIMITS);
    expect(hasErrors(issues)).toBe(false);
    expect(issues.some((i) => i.level === "warning")).toBe(true);
  });
});
