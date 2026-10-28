import { describe, expect, it } from "vitest";
import { newDocument } from "@/design/document";
import { finishingGroup, toggleFinishing } from "@/design/finishing";
import type { SurfaceKey } from "@/packaging/types";

const printable: SurfaceKey[] = ["front", "back", "left", "right", "top", "bottom"];
const base = () => newDocument({ templateCode: "x", templateVersion: 1, dimensions: { length: 300, width: 200, height: 120 }, materialCode: null });

describe("order finishing", () => {
  it("groups catalog codes", () => {
    expect(finishingGroup("gloss-lamination")).toBe("surface");
    expect(finishingGroup("hot-foil")).toBe("decor");
    expect(finishingGroup("ribbon-handles")).toBe("handles");
    expect(finishingGroup("window-patch")).toBe("structure");
    expect(finishingGroup("magnetic-closure")).toBe("note");
  });

  it("keeps one surface coating and applies it to every face", () => {
    let d = toggleFinishing(base(), "matte-varnish", { surfaceKey: "front", selectedId: null, printable });
    d = toggleFinishing(d, "gloss-lamination", { surfaceKey: "front", selectedId: null, printable });
    expect(d.finishingCodes).toEqual(["gloss-lamination"]);
    expect(printable.every((k) => d.surfaces[k].coating === "gloss")).toBe(true);
    d = toggleFinishing(d, "gloss-lamination", { surfaceKey: "front", selectedId: null, printable });
    expect(d.finishingCodes).toEqual([]);
    expect(d.surfaces.front.coating).toBe("none");
  });

  it("keeps one handle style", () => {
    let d = toggleFinishing(base(), "paper-handles", { surfaceKey: "front", selectedId: null, printable });
    d = toggleFinishing(d, "ribbon-handles", { surfaceKey: "front", selectedId: null, printable });
    expect(d.finishingCodes).toEqual(["ribbon-handles"]);
  });

  it("puts foil on the logo, retries when nothing carried it, and removes it when switched off", () => {
    let d = base();
    d = toggleFinishing(d, "hot-foil", { surfaceKey: "front", selectedId: null, printable });
    expect(d.finishingCodes).toEqual(["hot-foil"]);
    d.surfaces.front.elements.push({ id: "logo", type: "image", assetId: "a", mime: "image/png", naturalWidth: 10, naturalHeight: 10, x: 50, y: 50, width: 40, height: 40, rotation: 0 });
    d = toggleFinishing(d, "hot-foil", { surfaceKey: "front", selectedId: null, printable });
    expect(d.finishingCodes).toEqual(["hot-foil"]);
    expect(d.surfaces.front.elements[0].finish).toBe("foil-gold");
    d = toggleFinishing(d, "hot-foil", { surfaceKey: "front", selectedId: null, printable });
    expect(d.finishingCodes).toEqual([]);
    expect(d.surfaces.front.elements[0].finish).toBe("none");
  });

  it("inside print turns the inside colour on and off", () => {
    let d = toggleFinishing(base(), "inside-print", { surfaceKey: "front", selectedId: null, printable });
    expect(d.interior).not.toBeNull();
    d = toggleFinishing(d, "inside-print", { surfaceKey: "front", selectedId: null, printable });
    expect(d.interior).toBeNull();
  });
});
