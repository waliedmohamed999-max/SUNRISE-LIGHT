import { describe, expect, it } from "vitest";
import { designDocumentSchema, effectiveDpi, isOutsideSafeArea, newDocument, reflowSurfaces, type ImageElement, type TextElement } from "@/design/document";
import { getEngine } from "@/packaging/engine";
import { inspectImage, sanitizeSvg, UploadRejected } from "@/lib/upload-security";
import { can, CUSTOMER_TRANSITIONS, STAFF_TRANSITIONS } from "@/lib/rbac";

const img: ImageElement = { id: "a", type: "image", assetId: "x", mime: "image/png", naturalWidth: 1000, naturalHeight: 500, x: 150, y: 60, width: 100, height: 50, rotation: 0 };

describe("design document", () => {
  it("round-trips through the schema", () => {
    const doc = newDocument({ templateCode: "shipping-carton", templateVersion: 1, dimensions: { length: 300, width: 200, height: 120 }, materialCode: null });
    doc.surfaces.front.elements.push(img);
    expect(designDocumentSchema.parse(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
  });

  it("rejects malformed colours and unknown element types", () => {
    const doc = newDocument({ templateCode: "x", templateVersion: 1, dimensions: { length: 1, width: 1, height: 1 }, materialCode: null });
    expect(designDocumentSchema.safeParse({ ...doc, surfaces: { ...doc.surfaces, front: { background: "red", elements: [] } } }).success).toBe(false);
    expect(designDocumentSchema.safeParse({ ...doc, surfaces: { ...doc.surfaces, front: { background: null, elements: [{ ...img, type: "script" }] } } }).success).toBe(false);
  });

  it("reflows element centres proportionally and shrinks elements that no longer fit", () => {
    const e = getEngine("rsc");
    const before = e.surfaces({ length: 300, width: 200, height: 120 });
    const after = e.surfaces({ length: 600, width: 200, height: 40 });
    const text: TextElement = { id: "t", type: "text", text: "Hi", font: "inter", fontSizeMm: 20, color: "#000000", bold: false, align: "center", x: 150, y: 60, width: 100, height: 80, rotation: 0 };
    const doc = newDocument({ templateCode: "shipping-carton", templateVersion: 1, dimensions: { length: 300, width: 200, height: 120 }, materialCode: null });
    doc.surfaces.front.elements.push(text);
    const out = reflowSurfaces(doc.surfaces, before, after).front.elements[0] as TextElement;
    expect(out.x).toBeCloseTo(300);
    expect(out.y).toBeCloseTo(20);
    expect(out.height).toBeCloseTo(40);
    expect(out.fontSizeMm).toBeCloseTo(10);
  });

  it("computes effective print resolution", () => {
    expect(effectiveDpi(img)).toBe(254); // 1000px over 100mm
    expect(effectiveDpi({ ...img, mime: "image/svg+xml" })).toBeNull();
  });

  it("detects elements outside the safe area, including rotation", () => {
    expect(isOutsideSafeArea(img, { w: 300, h: 120 }, 5)).toBe(false);
    expect(isOutsideSafeArea({ ...img, x: 10 }, { w: 300, h: 120 }, 5)).toBe(true);
    expect(isOutsideSafeArea({ ...img, rotation: 90, height: 50, width: 100, y: 50 }, { w: 300, h: 120 }, 5)).toBe(true);
  });
});

describe("upload security", () => {
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000400000002008060000", "hex");

  it("identifies PNG by content, not by name", () => {
    const r = inspectImage(Buffer.concat([png, Buffer.alloc(32)]), 1e6);
    expect(r).toMatchObject({ mime: "image/png", width: 64, height: 32 });
  });

  it("rejects unknown and oversize content", () => {
    expect(() => inspectImage(Buffer.from("MZ executable"), 1e6)).toThrow(UploadRejected);
    expect(() => inspectImage(Buffer.concat([png, Buffer.alloc(100)]), 10)).toThrow("too_large");
  });

  it("strips scripts and event handlers from SVG", () => {
    const out = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><script>alert(1)</script><rect width="10" height="10" onclick="x()"/></svg>');
    expect(out).not.toMatch(/script|onload|onclick/i);
    expect(out).toContain("<rect");
  });

  it("rejects SVGs with external references or entities", () => {
    expect(() => sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://evil.example/x)"/></svg>')).toThrow(UploadRejected);
    expect(() => sanitizeSvg('<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>')).toThrow(UploadRejected);
  });
});

describe("access control & workflow", () => {
  it("restricts permissions by role", () => {
    expect(can("CUSTOMER", "admin.access")).toBe(false);
    expect(can("TECH_REVIEWER", "rfq.price")).toBe(false);
    expect(can("TECH_REVIEWER", "template.validate")).toBe(true);
    expect(can("SALES", "rfq.send")).toBe(true);
    expect(can("SALES", "user.manage")).toBe(false);
    expect(can("SUPER_ADMIN", "user.manage")).toBe(true);
  });

  it("keeps final statuses final", () => {
    for (const s of ["APPROVED", "REJECTED", "CANCELLED"] as const) {
      expect(STAFF_TRANSITIONS[s]).toEqual([]);
      expect(CUSTOMER_TRANSITIONS[s]).toEqual([]);
    }
  });

  it("only lets customers approve a quotation that was sent", () => {
    expect(CUSTOMER_TRANSITIONS.QUOTE_SENT).toContain("APPROVED");
    expect(Object.entries(CUSTOMER_TRANSITIONS).filter(([, to]) => to.includes("APPROVED")).map(([from]) => from)).toEqual(["QUOTE_SENT"]);
  });
});
