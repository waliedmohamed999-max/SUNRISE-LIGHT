import { describe, expect, it } from "vitest";
import { designDocumentSchema, newDocument } from "@/design/document";
import { applyPreset, DESIGN_PRESETS } from "@/design/presets";
import { ICON_KEYS, ICONS } from "@/design/icons";
import { ENGINES } from "@/packaging/engine";
import { SIZE_PRESETS } from "@/packaging/sizes";

// deterministic stand-in for canvas text measurement
const measure = ({ text, fontSizeMm }: { text: string; fontSizeMm: number }) => ({ width: text.length * fontSizeMm * 0.55, height: fontSizeMm * 1.5 });

describe("ready-made designs", () => {
  for (const engine of Object.values(ENGINES)) {
    for (const preset of DESIGN_PRESETS) {
      it(`${preset.key} on ${engine.key} produces a valid document`, () => {
        const dims = { length: 300, width: 200, height: 120 };
        const specs = engine.surfaces(dims);
        const doc = newDocument({ templateCode: "x", templateVersion: 1, dimensions: dims, materialCode: null });
        doc.surfaces = applyPreset(preset, doc.surfaces, { specs, brand: "علامتي", tagline: "صنع بعناية", font: "plexArabic", measure }, () => true);
        expect(designDocumentSchema.safeParse(doc).success).toBe(true);
        // text never wider than its face
        for (const s of specs) for (const el of doc.surfaces[s.key].elements) if (el.type === "text") expect(el.width).toBeLessThanOrEqual(s.w * 0.85);
      });
    }
  }

  it("keeps uploaded logos", () => {
    const dims = { length: 300, width: 200, height: 120 };
    const specs = ENGINES.rsc.surfaces(dims);
    const doc = newDocument({ templateCode: "x", templateVersion: 1, dimensions: dims, materialCode: null });
    doc.surfaces.front.elements.push({ id: "logo", type: "image", assetId: "a", mime: "image/png", naturalWidth: 10, naturalHeight: 10, x: 1, y: 1, width: 10, height: 10, rotation: 0 });
    const out = applyPreset(DESIGN_PRESETS[2], doc.surfaces, { specs, brand: "B", tagline: "", font: "inter", measure }, () => true);
    expect(out.front.elements.some((e) => e.id === "logo")).toBe(true);
  });
});

describe("elements & size data", () => {
  it("every icon has drawable parts and labels", () => {
    for (const k of ICON_KEYS) {
      expect(ICONS[k].parts.length).toBeGreaterThan(0);
      expect(ICONS[k].label.ar && ICONS[k].label.en).toBeTruthy();
    }
  });
  it("size presets are positive and plausible", () => {
    for (const list of Object.values(SIZE_PRESETS))
      for (const p of list) for (const v of Object.values(p.dims)) expect(v).toBeGreaterThan(10);
  });
});
