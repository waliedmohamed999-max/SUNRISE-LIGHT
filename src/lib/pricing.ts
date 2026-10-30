import { z } from "zod";
import type { DesignDocument } from "@/design/document";
import { getEngine } from "@/packaging/engine";
import { SURFACE_KEYS } from "@/packaging/types";

/*
 * Automatic pricing: the factory's price list (edited in the dashboard) and the pure calculation that turns a
 * design + specifications into a quotation. Shared by the server (RFQ submission, estimates) and the dashboard
 * simulator. It never reads prices from the customer: every amount comes from this config.
 */

export const PRINT_KEYS = ["none", "1c", "2c", "4c"] as const;
export type PrintKey = (typeof PRINT_KEYS)[number];
export const ELEMENT_FINISH_KEYS = ["foil-gold", "foil-silver", "emboss", "deboss", "spot-uv"] as const;
export const COATING_KEYS = ["matte", "gloss", "soft-touch"] as const;
export const ELEMENT_FINISH_LABELS: Record<(typeof ELEMENT_FINISH_KEYS)[number], { ar: string; en: string }> = {
  "foil-gold": { ar: "بصمة ذهبي", en: "Gold foil" },
  "foil-silver": { ar: "بصمة فضي", en: "Silver foil" },
  emboss: { ar: "كفراج بارز", en: "Emboss" },
  deboss: { ar: "كفراج غائر", en: "Deboss" },
  "spot-uv": { ar: "يو في موضعي", en: "Spot UV" },
};

const money = z.number().finite().min(0).max(1_000_000);
const rate = z.number().finite().min(0).max(100_000); // per m² / per unit
const percent = z.number().finite().min(0).max(100);

export const pricingConfigSchema = z.object({
  /** master switch: off = every request is priced manually by sales */
  enabled: z.boolean(),
  /** auto-send: the customer receives the quotation instantly; review: staff get a suggested price to send */
  mode: z.enum(["auto-send", "review"]),
  /** show a live estimate in the customer's quote form */
  showEstimate: z.boolean(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  taxPercent: percent,
  /** profit margin added on top of the computed cost */
  marginPercent: z.number().finite().min(0).max(1000),
  /** extra sheet area for trim and spoilage */
  wastePercent: percent,
  /** minimum order value before tax */
  minOrderTotal: money,
  /** quantities outside this range are always priced manually */
  minQuantity: z.number().int().min(1).max(10_000_000),
  maxAutoQuantity: z.number().int().min(1).max(10_000_000),
  validityDays: z.number().int().min(1).max(365),
  /** default advance payment and payment terms printed on quotations */
  depositPercent: percent,
  paymentTerms: z.string().trim().max(500),
  leadTime: z.string().trim().max(200),
  terms: z.string().trim().max(4000),
  /** board / paper price per m² of sheet, by material code */
  materials: z.record(z.string().max(60), rate),
  /** printing per m² of printed sheet, plus plate / make-ready setup per order */
  printing: z.object(Object.fromEntries(PRINT_KEYS.map((k) => [k, z.object({ perM2: rate, setup: money })])) as Record<PrintKey, z.ZodObject<{ perM2: typeof rate; setup: typeof money }>>),
  /** inside colour printing (box interior), per m² */
  insidePerM2: rate,
  /** whole-face lamination / varnish, per m² of sheet */
  coatings: z.object({ matte: rate, gloss: rate, "soft-touch": rate }),
  /** foil, emboss, spot UV on artwork: per unit per decorated face, plus block / die setup per face */
  elementFinishes: z.object(
    Object.fromEntries(ELEMENT_FINISH_KEYS.map((k) => [k, z.object({ perFace: rate, setup: money })])) as Record<
      (typeof ELEMENT_FINISH_KEYS)[number],
      z.ZodObject<{ perFace: typeof rate; setup: typeof money }>
    >,
  ),
  /** finishing options by code: per unit, per m², and setup per order */
  finishings: z.record(z.string().max(60), z.object({ perUnit: rate, perM2: rate, setup: money })),
  /** converting (cutting, creasing, gluing) by packaging engine: per unit, plus cutting-die setup per order */
  engines: z.record(z.string().max(30), z.object({ perUnit: rate, setup: money })),
  /** quantity discounts on the price before tax */
  tiers: z.array(z.object({ minQty: z.number().int().min(1).max(10_000_000), discountPercent: percent })).max(12),
});
export type PricingConfig = z.infer<typeof pricingConfigSchema>;

export const DEFAULT_PRICING: PricingConfig = {
  enabled: false,
  mode: "review",
  showEstimate: true,
  currency: "SAR",
  taxPercent: 15,
  marginPercent: 25,
  wastePercent: 8,
  minOrderTotal: 0,
  minQuantity: 100,
  maxAutoQuantity: 100_000,
  validityDays: 14,
  depositPercent: 50,
  paymentTerms: "",
  leadTime: "",
  terms: "",
  materials: {},
  printing: { none: { perM2: 0, setup: 0 }, "1c": { perM2: 0, setup: 0 }, "2c": { perM2: 0, setup: 0 }, "4c": { perM2: 0, setup: 0 } },
  insidePerM2: 0,
  coatings: { matte: 0, gloss: 0, "soft-touch": 0 },
  elementFinishes: {
    "foil-gold": { perFace: 0, setup: 0 },
    "foil-silver": { perFace: 0, setup: 0 },
    emboss: { perFace: 0, setup: 0 },
    deboss: { perFace: 0, setup: 0 },
    "spot-uv": { perFace: 0, setup: 0 },
  },
  finishings: {},
  engines: {},
  tiers: [],
};

/** Stored configs are merged onto the defaults so settings added later have a value. */
export function normalizePricing(raw: unknown): PricingConfig {
  const base = DEFAULT_PRICING;
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<PricingConfig>;
  const merged = {
    ...base,
    ...r,
    printing: { ...base.printing, ...(r.printing ?? {}) },
    coatings: { ...base.coatings, ...(r.coatings ?? {}) },
    elementFinishes: { ...base.elementFinishes, ...(r.elementFinishes ?? {}) },
  };
  const parsed = pricingConfigSchema.safeParse(merged);
  return parsed.success ? parsed.data : base;
}

/** What the calculation needs, independent of where it came from (live estimate, RFQ, simulator). */
export interface QuoteInput {
  engineKey: string;
  /** flat sheet area of one unit, from the dieline bounding box (mm²) */
  sheetAreaMm2: number;
  materialCode: string | null;
  printOption: PrintKey;
  insidePrint: boolean;
  coating: (typeof COATING_KEYS)[number] | null;
  /** decorated faces per element finish, e.g. { "foil-gold": 2 } */
  elementFinishFaces: Partial<Record<(typeof ELEMENT_FINISH_KEYS)[number], number>>;
  finishingCodes: string[];
  quantity: number;
}

// a type alias (not an interface) so it is assignable to Prisma JSON
export type QuoteLine = {
  key: string;
  label: { ar: string; en: string };
  amount: number;
};

/* ───────────── quote builder: the lines a quotation is made of ───────────── */

export const LINE_BASES = ["unit", "m2", "fixed"] as const;
export type LineBasis = (typeof LINE_BASES)[number];

const label = z.object({ ar: z.string().trim().max(120), en: z.string().trim().max(120) });

/** One cost line: rate × (quantity | sheet m² × quantity | 1). */
export const builderLineSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  label,
  basis: z.enum(LINE_BASES),
  rate: z.number().finite().min(0).max(1_000_000),
  /** the quote's profit margin is added on this line */
  markup: z.boolean(),
  /** shown to the customer as a separate charge; otherwise folded into the unit price */
  show: z.boolean(),
});
export type BuilderLine = z.infer<typeof builderLineSchema>;

export const quoteOptionSchema = z.object({
  quantity: z.number().int().min(1).max(10_000_000),
  discountPercent: z.number().finite().min(0).max(100),
  /** fixes the product unit price for this option (the lines still show the cost behind it) */
  unitPriceOverride: z.number().finite().positive().max(1_000_000).nullable(),
});
export type QuoteOption = z.infer<typeof quoteOptionSchema>;

/** Everything the factory decides on a quotation (no computed figures: the server derives those). */
export const quoteBuildSchema = z.object({
  lines: z.array(builderLineSchema).min(1).max(40),
  marginPercent: z.number().finite().min(0).max(1000),
  options: z.array(quoteOptionSchema).min(1).max(4),
  taxPercent: z.number().finite().min(0).max(100),
  minOrderTotal: z.number().finite().min(0).max(100_000_000).default(0),
  depositPercent: z.number().finite().min(0).max(100),
  paymentTerms: z.string().trim().max(500),
  customerNote: z.string().trim().max(2000),
  /** never shown to the customer */
  internalNote: z.string().trim().max(2000),
});
export type QuoteBuild = z.infer<typeof quoteBuildSchema>;

export type OptionResult = {
  quantity: number;
  /** product unit price (hidden lines + margin), before discount */
  unitPrice: number;
  productTotal: number;
  /** lines shown to the customer as separate charges, at price */
  charges: { id: string; label: { ar: string; en: string }; amount: number }[];
  discountPercent: number;
  discount: number;
  /** raises the order to the minimum order value */
  minimumAdjustment: number;
  subtotal: number;
  tax: number;
  total: number;
  /** subtotal ÷ quantity, after discount and charges */
  effectiveUnitPrice: number;
  deposit: number;
  /** staff only */
  cost: number;
  profit: number;
  profitPercent: number;
  lineCosts: { id: string; amount: number }[];
};

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export function lineAmount(l: Pick<BuilderLine, "basis" | "rate">, quantity: number, areaM2: number) {
  return l.basis === "unit" ? l.rate * quantity : l.basis === "m2" ? l.rate * areaM2 * quantity : l.rate;
}

/** Price one quantity option of a quotation. Pure: the dashboard shows it live, the server stores it. */
export function evaluateOption(b: Pick<QuoteBuild, "lines" | "marginPercent" | "taxPercent" | "depositPercent" | "minOrderTotal">, option: QuoteOption, areaM2: number): OptionResult {
  const n = option.quantity;
  const m = 1 + b.marginPercent / 100;
  const lineCosts = b.lines.map((l) => ({ id: l.id, amount: round(lineAmount(l, n, areaM2), 2) }));
  const price = (l: BuilderLine, i: number) => lineCosts[i].amount * (l.markup ? m : 1);
  const product = b.lines.reduce((s, l, i) => (l.show ? s : s + price(l, i)), 0);
  const unitPrice = option.unitPriceOverride ?? Math.max(0.001, round(product / n, 3));
  const productTotal = round(unitPrice * n, 2);
  const charges = b.lines.flatMap((l, i) => (l.show ? [{ id: l.id, label: l.label, amount: round(price(l, i), 2) }] : []));
  const gross = productTotal + charges.reduce((s, c) => s + c.amount, 0);
  const discount = round(gross * (option.discountPercent / 100), 2);
  let subtotal = round(gross - discount, 2);
  const minimumAdjustment = subtotal < (b.minOrderTotal ?? 0) ? round(b.minOrderTotal - subtotal, 2) : 0;
  subtotal = round(subtotal + minimumAdjustment, 2);
  const tax = round(subtotal * (b.taxPercent / 100), 2);
  const total = round(subtotal + tax, 2);
  const cost = round(
    lineCosts.reduce((s, l) => s + l.amount, 0),
    2,
  );
  const profit = round(subtotal - cost, 2);
  return {
    quantity: n,
    unitPrice,
    productTotal,
    charges,
    discountPercent: option.discountPercent,
    discount,
    minimumAdjustment,
    subtotal,
    tax,
    total,
    effectiveUnitPrice: round(subtotal / n, 3),
    deposit: round(total * (b.depositPercent / 100), 2),
    cost,
    profit,
    profitPercent: subtotal > 0 ? round((profit / subtotal) * 100, 1) : 0,
    lineCosts,
  };
}

export type QuoteResult =
  | {
      ok: true;
      currency: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      taxPercent: number;
      tax: number;
      total: number;
      /** cost lines (staff only): before margin and discount */
      lines: QuoteLine[];
      /** the same cost lines as editable quote-builder lines */
      builder: BuilderLine[];
      areaM2: number;
      cost: number;
      margin: number;
      discountPercent: number;
      discount: number;
      minOrderApplied: boolean;
      effectiveUnitPrice: number;
      nextTier: { minQty: number; discountPercent: number } | null;
    }
  | { ok: false; reasons: { code: string; ar: string; en: string }[] };

/** Price-list lines for a request (rates, not amounts), or the reasons it cannot be priced automatically. */
export function priceListLines(cfg: PricingConfig, q: QuoteInput, names: { finishings?: Record<string, { ar: string; en: string }> } = {}) {
  const reasons: { code: string; ar: string; en: string }[] = [];
  const areaM2 = (q.sheetAreaMm2 / 1e6) * (1 + cfg.wastePercent / 100);
  if (!Number.isFinite(areaM2) || areaM2 <= 0) reasons.push({ code: "area", ar: "تعذّر حساب مساحة الفرخ.", en: "Sheet area could not be computed." });
  const matPrice = q.materialCode ? cfg.materials[q.materialCode] : undefined;
  if (!matPrice) reasons.push({ code: "material", ar: "لا يوجد سعر للخامة المختارة.", en: "No price for the selected material." });
  const engine = cfg.engines[q.engineKey];
  if (!engine) reasons.push({ code: "engine", ar: "لا يوجد سعر تصنيع لهذا النوع من العبوات.", en: "No converting price for this packaging type." });
  const print = cfg.printing[q.printOption];
  if (q.printOption !== "none" && !print.perM2 && !print.setup) reasons.push({ code: "print", ar: "لا يوجد سعر لنوع الطباعة.", en: "No price for the print option." });
  const unpriced = q.finishingCodes.filter((c) => c !== "none" && !cfg.finishings[c]);
  if (unpriced.length) reasons.push({ code: "finishing", ar: `تشطيبات بدون سعر: ${unpriced.join("، ")}`, en: `Finishings without a price: ${unpriced.join(", ")}` });

  const lines: BuilderLine[] = [];
  const add = (id: string, ar: string, en: string, basis: LineBasis, rate: number) => rate > 0 && lines.push({ id, label: { ar, en }, basis, rate: round(rate, 4), markup: true, show: false });
  if (matPrice) add("material", "الخامة", "Material", "m2", matPrice);
  if (q.printOption !== "none") {
    add("printing", "الطباعة", "Printing", "m2", print.perM2);
    add("printing-setup", "تجهيز الطباعة (البليتات)", "Print setup (plates)", "fixed", print.setup);
  }
  if (q.insidePrint) add("inside", "طباعة داخلية", "Inside print", "m2", cfg.insidePerM2);
  if (q.coating) add("coating", "السلوفان / الورنيش", "Coating", "m2", cfg.coatings[q.coating]);
  for (const [k, faces] of Object.entries(q.elementFinishFaces)) {
    const p = cfg.elementFinishes[k as keyof typeof cfg.elementFinishes];
    if (!p || !faces) continue;
    const l = ELEMENT_FINISH_LABELS[k as keyof typeof ELEMENT_FINISH_LABELS];
    add(`finish-${k}`, faces > 1 ? `${l.ar} (${faces} أوجه)` : l.ar, faces > 1 ? `${l.en} (${faces} faces)` : l.en, "unit", p.perFace * faces);
    add(`finish-${k}-setup`, `تجهيز ${l.ar}`, `${l.en} setup`, "fixed", p.setup * faces);
  }
  for (const c of q.finishingCodes) {
    const f = cfg.finishings[c];
    if (!f) continue;
    const name = names.finishings?.[c] ?? { ar: c, en: c };
    add(`fin-${c}-unit`, name.ar, name.en, "unit", f.perUnit);
    add(`fin-${c}-m2`, name.ar, name.en, "m2", f.perM2);
    add(`fin-${c}-setup`, `تجهيز ${name.ar}`, `${name.en} setup`, "fixed", f.setup);
  }
  if (engine) {
    add("converting", "القص والتكسير واللصق", "Cutting, creasing & gluing", "unit", engine.perUnit);
    add("die", "تجهيز فورمة القص", "Cutting die setup", "fixed", engine.setup);
  }
  return { ok: reasons.length === 0, reasons, lines, areaM2 };
}

/** Price one request from the price list. Returns reasons instead of a price when the list does not cover it. */
export function computeQuote(cfg: PricingConfig, q: QuoteInput, names: { finishings?: Record<string, { ar: string; en: string }> } = {}): QuoteResult {
  const n = q.quantity;
  const base = priceListLines(cfg, q, names);
  const reasons = [...base.reasons];
  if (n < cfg.minQuantity)
    reasons.push({ code: "qty_low", ar: `الكمية أقل من الحد الأدنى للتسعير التلقائي (${cfg.minQuantity}).`, en: `Quantity is below the automatic minimum (${cfg.minQuantity}).` });
  if (n > cfg.maxAutoQuantity)
    reasons.push({ code: "qty_high", ar: `الكمية أكبر من حد التسعير التلقائي (${cfg.maxAutoQuantity}).`, en: `Quantity is above the automatic limit (${cfg.maxAutoQuantity}).` });
  if (reasons.length) return { ok: false, reasons };

  const tiers = [...cfg.tiers].sort((a, b) => a.minQty - b.minQty);
  const discountPercent = tiers.filter((t) => n >= t.minQty).at(-1)?.discountPercent ?? 0;
  const r = evaluateOption(
    { lines: base.lines, marginPercent: cfg.marginPercent, taxPercent: cfg.taxPercent, depositPercent: 0, minOrderTotal: cfg.minOrderTotal },
    { quantity: n, discountPercent, unitPriceOverride: null },
    base.areaM2,
  );
  const next = tiers.find((t) => t.minQty > n && t.discountPercent > discountPercent) ?? null;
  return {
    ok: true,
    currency: cfg.currency,
    quantity: n,
    unitPrice: r.unitPrice,
    subtotal: r.subtotal,
    taxPercent: cfg.taxPercent,
    tax: r.tax,
    total: r.total,
    lines: base.lines.map((l, i) => ({ key: l.id, label: l.label, amount: r.lineCosts[i].amount })),
    builder: base.lines,
    areaM2: base.areaM2,
    cost: r.cost,
    margin: round(r.productTotal - r.cost, 2),
    discountPercent,
    discount: r.discount,
    minOrderApplied: r.minimumAdjustment > 0,
    effectiveUnitPrice: r.effectiveUnitPrice,
    nextTier: next ? { minQty: next.minQty, discountPercent: next.discountPercent } : null,
  };
}

/** Customer-safe view of a stored quotation: prices only — no rates, costs, margin or internal note. */
export function customerQuoteView(details: unknown) {
  const d = details as { computed?: OptionResult[]; depositPercent?: number; paymentTerms?: string; customerNote?: string } | null;
  if (!d?.computed?.length) return null;
  return {
    options: d.computed.map((o) => ({
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      productTotal: o.productTotal,
      charges: o.charges.map((c) => ({ label: c.label, amount: c.amount })),
      discountPercent: o.discountPercent,
      discount: o.discount,
      minimumAdjustment: o.minimumAdjustment,
      subtotal: o.subtotal,
      tax: o.tax,
      total: o.total,
      effectiveUnitPrice: o.effectiveUnitPrice,
      deposit: o.deposit,
    })),
    depositPercent: d.depositPercent ?? 0,
    paymentTerms: d.paymentTerms ?? "",
    customerNote: d.customerNote ?? "",
  };
}
export type CustomerQuoteView = NonNullable<ReturnType<typeof customerQuoteView>>;

/** Build the calculation input from a (server-validated) design document and the chosen specifications. */
export function quoteInputFromDesign(doc: DesignDocument, engineKey: string, spec: { materialCode: string | null; finishingCodes: string[]; quantity: number }): QuoteInput {
  const engine = getEngine(engineKey);
  const dl = engine.dieline(doc.dimensions);
  const printable = engine.surfaces(doc.dimensions).map((s) => s.key);
  const faces = SURFACE_KEYS.filter((k) => printable.includes(k)).map((k) => doc.surfaces[k]);
  const hasArt = faces.some((s) => s.elements.length > 0 || s.fill || (s.background && s.background.toLowerCase() !== "#ffffff"));
  // the customer's explicit print choice wins; otherwise any artwork is printed in full colour
  const printOption: PrintKey = PRINT_KEYS.includes(doc.printOption as PrintKey) ? (doc.printOption as PrintKey) : hasArt ? "4c" : "none";
  const elementFinishFaces: QuoteInput["elementFinishFaces"] = {};
  for (const k of ELEMENT_FINISH_KEYS) {
    const count = faces.filter((s) => s.elements.some((e) => e.finish === k)).length;
    if (count) elementFinishFaces[k] = count;
  }
  const coatingRank = { matte: 1, gloss: 1, "soft-touch": 2 } as const;
  const coating =
    faces
      .map((s) => s.coating)
      .filter((c): c is (typeof COATING_KEYS)[number] => !!c && c !== "none")
      .sort((a, b) => coatingRank[b] - coatingRank[a])[0] ?? null;
  return {
    engineKey,
    sheetAreaMm2: dl.width * dl.height,
    materialCode: spec.materialCode,
    printOption,
    insidePrint: !!doc.interior,
    coating,
    elementFinishFaces,
    finishingCodes: [...new Set(spec.finishingCodes)],
    quantity: spec.quantity,
  };
}
