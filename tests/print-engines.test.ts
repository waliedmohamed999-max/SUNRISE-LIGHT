import { describe, expect, it } from "vitest";
import { getEngine, hasErrors, validateDimensions } from "@/packaging/engine";
import { cupGeometry } from "@/packaging/templates/print-engines";

describe("paper cup engine", () => {
  const d = { length: 80, width: 56, height: 92 }; // 8 oz: top Ø, bottom Ø, height
  const cup = getEngine("cup");

  it("unrolls into a fan whose arcs match the rim and base circumferences", () => {
    const g = cupGeometry(d);
    expect(g.Ro * g.theta).toBeCloseTo(Math.PI * d.length, 6); // outer arc = mouth circumference
    expect(g.Ri * g.theta).toBeCloseTo(Math.PI * d.width, 6); // inner arc = base circumference
    expect(g.Ro - g.Ri).toBeCloseTo(g.slant, 6);
    expect(g.slant).toBeCloseTo(Math.hypot(d.height, (d.length - d.width) / 2), 6);
  });

  it("designs on one wrap surface sized mid-circumference × slant", () => {
    const [s] = cup.surfaces(d);
    expect(cup.surfaces(d)).toHaveLength(1);
    expect(s.key).toBe("front");
    expect(s.w).toBeCloseTo(Math.PI * ((d.length + d.width) / 2), 6);
  });

  it("produces a wall with a fan art mapping, a glue seam and a bottom disc", () => {
    const dl = cup.dieline(d);
    const wall = dl.panels.find((p) => p.id === "wall")!;
    expect(wall.art?.fan).toBeDefined();
    expect(dl.panels.map((p) => p.id).sort()).toEqual(["bottom", "seam", "wall"]);
    expect(Math.min(...dl.panels.flatMap((p) => p.points.map((q) => q[0])))).toBeGreaterThanOrEqual(-1e-9);
  });

  it("rejects a cup that is wider at the base than at the mouth", () => {
    const limits = { minLengthMm: 40, maxLengthMm: 120, minWidthMm: 30, maxWidthMm: 120, minHeightMm: 40, maxHeightMm: 200 };
    expect(hasErrors(validateDimensions(cup, { length: 60, width: 70, height: 90 }, limits))).toBe(true);
    expect(hasErrors(validateDimensions(cup, d, limits))).toBe(false);
  });

  it("rejects a near-cylinder whose unrolled fan would be unbounded", () => {
    const limits = { minLengthMm: 40, maxLengthMm: 120, minWidthMm: 30, maxWidthMm: 120, minHeightMm: 40, maxHeightMm: 200 };
    expect(hasErrors(validateDimensions(cup, { length: 70, width: 69.9, height: 90 }, limits))).toBe(true);
    expect(hasErrors(validateDimensions(cup, { length: 70, width: 70, height: 90 }, limits))).toBe(true);
    expect(cupGeometry({ length: 70, width: 68, height: 200 }).Ro).toBeLessThan(10_000);
  });
});

describe("flat prints", () => {
  it("sheet: one printed face with the art mapped edge to edge", () => {
    const sheet = getEngine("sheet");
    expect(sheet.surfaces({ length: 148, width: 1, height: 210 })).toEqual([expect.objectContaining({ key: "front", w: 148, h: 210 })]);
    const dl = sheet.dieline({ length: 148, width: 1, height: 210 });
    expect(dl.panels).toHaveLength(1);
    expect(dl.panels[0].art).toMatchObject({ surface: "front", sw: 148, sh: 210 });
  });

  it("round: diameter only, die-cut circle", () => {
    const round = getEngine("round");
    expect(round.surfaces({ length: 50, width: 1, height: 1 })).toEqual([expect.objectContaining({ w: 50, h: 50 })]);
    const pts = round.dieline({ length: 50, width: 1, height: 1 }).panels[0].points;
    for (const [x, y] of pts) expect(Math.hypot(x - 25, y - 25)).toBeCloseTo(25, 6);
    expect(round.axes && Object.keys(round.axes)).toEqual(["length"]);
  });
});
