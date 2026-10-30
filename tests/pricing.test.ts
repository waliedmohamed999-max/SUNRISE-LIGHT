import { describe, expect, it } from "vitest";
import { computeQuote, customerQuoteView, DEFAULT_PRICING, evaluateOption, normalizePricing, pricingConfigSchema, quoteBuildSchema, quoteInputFromDesign, type PricingConfig, type QuoteBuild, type QuoteInput } from "@/lib/pricing";
import { newDocument } from "@/design/document";
import { getEngine } from "@/packaging/engine";

// 1 m² sheet, no waste: every figure below can be checked by hand
const cfg: PricingConfig = {
  ...DEFAULT_PRICING,
  enabled: true,
  marginPercent: 20,
  wastePercent: 0,
  taxPercent: 15,
  minQuantity: 100,
  maxAutoQuantity: 50_000,
  materials: { "kraft-board": 10 },
  printing: { ...DEFAULT_PRICING.printing, "4c": { perM2: 2, setup: 100 } },
  engines: { rsc: { perUnit: 0.5, setup: 200 } },
  finishings: { "matte-varnish": { perUnit: 0.1, perM2: 0, setup: 50 } },
};
const input: QuoteInput = { engineKey: "rsc", sheetAreaMm2: 1_000_000, materialCode: "kraft-board", printOption: "4c", insidePrint: false, coating: null, elementFinishFaces: {}, finishingCodes: [], quantity: 1000 };

describe("automatic pricing", () => {
  it("adds material, printing, converting and setup, then margin and VAT", () => {
    const q = computeQuote(cfg, input);
    if (!q.ok) throw new Error("expected a price");
    // 10×1000 + 2×1000 + 100 + 0.5×1000 + 200 = 12 800 cost; +20% = 15 360
    expect(q.cost).toBe(12_800);
    expect(q.margin).toBe(2_560);
    expect(q.unitPrice).toBe(15.36);
    expect(q.subtotal).toBe(15_360);
    expect(q.tax).toBe(2_304);
    expect(q.total).toBe(17_664);
  });

  it("applies the highest quantity tier reached and points to the next one", () => {
    const q = computeQuote({ ...cfg, tiers: [{ minQty: 500, discountPercent: 5 }, { minQty: 1000, discountPercent: 10 }, { minQty: 5000, discountPercent: 15 }] }, input);
    if (!q.ok) throw new Error("expected a price");
    expect(q.discountPercent).toBe(10);
    expect(q.subtotal).toBe(13_824);
    expect(q.nextTier).toEqual({ minQty: 5000, discountPercent: 15 });
  });

  it("raises small orders to the minimum order value", () => {
    const q = computeQuote({ ...cfg, minOrderTotal: 50_000 }, input);
    if (!q.ok) throw new Error("expected a price");
    expect(q.minOrderApplied).toBe(true);
    expect(q.subtotal).toBe(50_000);
  });

  it("keeps the stored subtotal equal to unit price × quantity", () => {
    for (const quantity of [101, 333, 777, 12_345]) {
      const q = computeQuote({ ...cfg, wastePercent: 7.3 }, { ...input, quantity });
      if (!q.ok) throw new Error("expected a price");
      expect(q.subtotal).toBeCloseTo(Math.round(q.unitPrice * quantity * 100) / 100, 6);
    }
  });

  it("falls back to manual pricing when the price list does not cover the request", () => {
    const reasons = (q: ReturnType<typeof computeQuote>) => (q.ok ? [] : q.reasons.map((r) => r.code));
    expect(reasons(computeQuote(cfg, { ...input, materialCode: "white-board" }))).toContain("material");
    expect(reasons(computeQuote(cfg, { ...input, engineKey: "cup" }))).toContain("engine");
    expect(reasons(computeQuote(cfg, { ...input, finishingCodes: ["hot-foil"] }))).toContain("finishing");
    expect(reasons(computeQuote(cfg, { ...input, quantity: 50 }))).toContain("qty_low");
    expect(reasons(computeQuote(cfg, { ...input, quantity: 60_000 }))).toContain("qty_high");
    expect(reasons(computeQuote(cfg, { ...input, printOption: "2c" }))).toContain("print");
  });

  it("prices finishing options and artwork finishes per face", () => {
    const withFinish = computeQuote(
      { ...cfg, elementFinishes: { ...cfg.elementFinishes, "foil-gold": { perFace: 0.3, setup: 150 } } },
      { ...input, finishingCodes: ["matte-varnish"], elementFinishFaces: { "foil-gold": 2 } },
    );
    if (!withFinish.ok) throw new Error("expected a price");
    // varnish 0.1×1000 + 50 = 150; foil 0.3×2×1000 + 150×2 = 900
    expect(withFinish.cost).toBe(12_800 + 150 + 900);
  });
});

describe("price list config", () => {
  it("rejects negative or absurd values", () => {
    expect(pricingConfigSchema.safeParse({ ...cfg, marginPercent: -5 }).success).toBe(false);
    expect(pricingConfigSchema.safeParse({ ...cfg, taxPercent: 150 }).success).toBe(false);
    expect(pricingConfigSchema.safeParse({ ...cfg, materials: { x: -1 } }).success).toBe(false);
    expect(pricingConfigSchema.safeParse(cfg).success).toBe(true);
  });

  it("merges stored settings onto the defaults and ignores invalid data", () => {
    expect(normalizePricing({ enabled: true, taxPercent: 5 })).toMatchObject({ enabled: true, taxPercent: 5, printing: DEFAULT_PRICING.printing });
    expect(normalizePricing("garbage")).toEqual(DEFAULT_PRICING);
    expect(normalizePricing({ taxPercent: -1 })).toEqual(DEFAULT_PRICING);
  });
});

describe("pricing input from a design", () => {
  const dims = { length: 300, width: 200, height: 150 };
  const base = newDocument({ templateCode: "x", templateVersion: 1, dimensions: dims, materialCode: "kraft-board" });

  it("uses the real cutting-sheet area of the dieline", () => {
    const dl = getEngine("rsc").dieline(dims);
    expect(quoteInputFromDesign(base, "rsc", { materialCode: "kraft-board", finishingCodes: [], quantity: 500 }).sheetAreaMm2).toBeCloseTo(dl.width * dl.height, 6);
  });

  it("infers full colour from artwork, keeps an explicit print choice, and counts foil faces", () => {
    expect(quoteInputFromDesign(base, "rsc", { materialCode: null, finishingCodes: [], quantity: 1 }).printOption).toBe("none");
    const art = structuredClone(base);
    art.surfaces.front.background = "#112233";
    art.surfaces.front.elements = [{ id: "t", type: "text", x: 10, y: 10, width: 50, height: 10, rotation: 0, text: "Hi", font: "plexArabic", fontSizeMm: 8, color: "#000000", bold: true, align: "center", finish: "foil-gold" }];
    art.surfaces.top.elements = art.surfaces.front.elements;
    const inp = quoteInputFromDesign(art, "rsc", { materialCode: null, finishingCodes: [], quantity: 1 });
    expect(inp.printOption).toBe("4c");
    expect(inp.elementFinishFaces).toEqual({ "foil-gold": 2 });
    expect(quoteInputFromDesign({ ...art, printOption: "1c" }, "rsc", { materialCode: null, finishingCodes: [], quantity: 1 }).printOption).toBe("1c");
  });
});

describe("quote builder", () => {
  const build: QuoteBuild = {
    lines: [
      { id: "mat", label: { ar: "الخامة", en: "Material" }, basis: "m2", rate: 10, markup: true, show: false },
      { id: "die", label: { ar: "فورمة", en: "Die" }, basis: "fixed", rate: 200, markup: true, show: false },
      { id: "ship", label: { ar: "شحن", en: "Shipping" }, basis: "fixed", rate: 300, markup: false, show: true },
    ],
    marginPercent: 20,
    options: [{ quantity: 1000, discountPercent: 0, unitPriceOverride: null }],
    taxPercent: 15,
    minOrderTotal: 0,
    depositPercent: 50,
    paymentTerms: "50% advance",
    customerNote: "Thank you",
    internalNote: "cost negotiated with supplier",
  };

  it("folds hidden lines into the unit price and lists shown lines as charges", () => {
    // hidden: (10×1×1000 + 200) × 1.2 = 12 240 → 12.24 / piece; shipping 300 at cost
    const r = evaluateOption(build, build.options[0], 1);
    expect(r.unitPrice).toBe(12.24);
    expect(r.productTotal).toBe(12_240);
    expect(r.charges).toEqual([{ id: "ship", label: { ar: "شحن", en: "Shipping" }, amount: 300 }]);
    expect(r.subtotal).toBe(12_540);
    expect(r.tax).toBe(1_881);
    expect(r.total).toBe(14_421);
    expect(r.deposit).toBe(7_210.5);
    expect(r.cost).toBe(10_500);
    expect(r.profit).toBe(2_040);
  });

  it("applies the option discount to the whole order and honours a fixed unit price", () => {
    const d = evaluateOption(build, { quantity: 1000, discountPercent: 10, unitPriceOverride: null }, 1);
    expect(d.discount).toBe(1_254);
    expect(d.subtotal).toBe(11_286);
    const o = evaluateOption(build, { quantity: 1000, discountPercent: 0, unitPriceOverride: 11 }, 1);
    expect(o.unitPrice).toBe(11);
    expect(o.subtotal).toBe(11_300);
  });

  it("flags a price below cost as a loss", () => {
    const r = evaluateOption({ ...build, marginPercent: 0 }, { quantity: 1000, discountPercent: 30, unitPriceOverride: null }, 1);
    expect(r.profit).toBeLessThan(0);
    expect(r.profitPercent).toBeLessThan(0);
  });

  it("gives the customer prices only — no rates, costs, margin or internal note", () => {
    const stored = { version: 1, areaM2: 1, ...build, computed: build.options.map((o) => evaluateOption(build, o, 1)) };
    const view = customerQuoteView(stored)!;
    const text = JSON.stringify(view);
    expect(view.options[0].total).toBe(14_421);
    for (const leak of ["cost negotiated", "internalNote", "marginPercent", "profit", "lineCosts", '"cost"', '"rate"', "markup"]) expect(text).not.toContain(leak);
  });

  it("validates the builder input", () => {
    expect(quoteBuildSchema.safeParse(build).success).toBe(true);
    expect(quoteBuildSchema.safeParse({ ...build, lines: [] }).success).toBe(false);
    expect(quoteBuildSchema.safeParse({ ...build, options: Array(5).fill(build.options[0]) }).success).toBe(false);
    expect(quoteBuildSchema.safeParse({ ...build, lines: [{ ...build.lines[0], rate: -1 }] }).success).toBe(false);
    expect(quoteBuildSchema.safeParse({ ...build, lines: [{ ...build.lines[0], id: "../x" }] }).success).toBe(false);
  });
});
