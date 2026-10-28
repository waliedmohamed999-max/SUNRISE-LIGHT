import { describe, expect, it } from "vitest";
import { ean13CheckDigit, ean13Pattern, normaliseEan13, qrMatrix } from "@/design/codes";
import { designDocumentSchema, newDocument } from "@/design/document";

describe("EAN-13", () => {
  it("computes the check digit (reference: 400638133393 → 1)", () => {
    expect(ean13CheckDigit("400638133393")).toBe(1);
    expect(normaliseEan13("400638133393")).toBe("4006381333931");
  });
  it("accepts a valid 13-digit code and rejects a wrong check digit", () => {
    expect(normaliseEan13("4006381333931")).toBe("4006381333931");
    expect(normaliseEan13("4006381333932")).toBeNull();
    expect(normaliseEan13("123")).toBeNull();
  });
  it("encodes 95 modules with guard bars", () => {
    const p = ean13Pattern("4006381333931");
    expect(p).toHaveLength(95);
    expect(p.startsWith("101")).toBe(true);
    expect(p.slice(45, 50)).toBe("01010");
    expect(p.endsWith("101")).toBe(true);
  });
});

describe("QR", () => {
  it("builds a square matrix, including Arabic text", () => {
    for (const v of ["https://example.com", "مصنع ضوء الشروق"]) {
      const m = qrMatrix(v);
      expect(m.length).toBeGreaterThanOrEqual(21);
      expect(m.every((row) => row.length === m.length)).toBe(true);
      // finder pattern corner is dark
      expect(m[0][0]).toBe(true);
    }
  });
});

describe("design tools in the document schema", () => {
  it("accepts opacity, flips, tint, text styling, codes and face fills", () => {
    const doc = newDocument({ templateCode: "x", templateVersion: 1, dimensions: { length: 300, width: 200, height: 120 }, materialCode: null });
    doc.surfaces.front.fill = { type: "gradient", from: "#2F357C", to: "#EA5B32", angle: 45 };
    doc.surfaces.back.fill = { type: "pattern", pattern: "dots", fg: "#FFFFFF", bg: "#2F357C", scale: 10 };
    doc.surfaces.front.elements.push(
      { id: "t", type: "text", text: "Hi", font: "inter", fontSizeMm: 10, color: "#000000", bold: true, align: "center", x: 10, y: 10, width: 20, height: 10, rotation: 0, letterSpacing: 0.2, lineHeight: 1.5, strokeColor: "#FFFFFF", strokeWidth: 0.08, opacity: 0.8, flipX: true },
      { id: "q", type: "code", kind: "qr", value: "https://example.com", color: "#000000", background: "#FFFFFF", x: 50, y: 50, width: 30, height: 30, rotation: 0 },
      { id: "i", type: "image", assetId: "a", mime: "image/png", naturalWidth: 10, naturalHeight: 10, x: 1, y: 1, width: 10, height: 10, rotation: 0, tint: "#FFFFFF" },
    );
    expect(designDocumentSchema.safeParse(JSON.parse(JSON.stringify(doc))).success).toBe(true);
  });
  it("rejects out-of-range values", () => {
    const doc = newDocument({ templateCode: "x", templateVersion: 1, dimensions: { length: 300, width: 200, height: 120 }, materialCode: null });
    doc.surfaces.front.elements.push({ id: "q", type: "code", kind: "qr", value: "x", color: "#000000", background: null, x: 1, y: 1, width: 10, height: 10, rotation: 0, opacity: 3 });
    expect(designDocumentSchema.safeParse(doc).success).toBe(false);
  });
});
