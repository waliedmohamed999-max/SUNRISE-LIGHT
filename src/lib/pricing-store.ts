import "server-only";
import { db } from "./db";
import { computeQuote, normalizePricing, priceListLines, quoteInputFromDesign, type PricingConfig, type QuoteResult } from "./pricing";
import { designDocumentSchema, type DesignDocument } from "@/design/document";
import { getEngine } from "@/packaging/engine";

/** The factory's price list lives in one pricing rule row. */
export const PRICING_KEY = "default";

export async function getPricing(): Promise<PricingConfig> {
  const row = await db.pricingRule.findUnique({ where: { key: PRICING_KEY } });
  return normalizePricing(row?.config);
}

/** Finishing names for readable breakdown lines. */
async function finishingNames() {
  const rows = await db.finishingOption.findMany({ select: { code: true, nameAr: true, nameEn: true } });
  return Object.fromEntries(rows.map((r) => [r.code, { ar: r.nameAr, en: r.nameEn }]));
}

/** Price a server-validated design with the current price list. */
export async function priceDesign(
  doc: DesignDocument,
  engineKey: string,
  spec: { materialCode: string | null; finishingCodes: string[]; quantity: number },
  cfg?: PricingConfig,
): Promise<QuoteResult> {
  const config = cfg ?? (await getPricing());
  return computeQuote(config, quoteInputFromDesign(doc, engineKey, spec), { finishings: await finishingNames() });
}

/** Cutting-sheet area (m², with the price list's waste) of a request's first item, from its submitted design version. */
export async function requestSheetArea(requestId: string, cfg?: PricingConfig) {
  const item = await db.quotationItem.findFirst({ where: { requestId }, include: { designVersion: { select: { document: true } } } });
  if (!item) return null;
  const parsed = designDocumentSchema.safeParse(item.designVersion.document);
  const engineKey = (item.specSnapshot as { template?: { engineKey?: string } }).template?.engineKey;
  if (!parsed.success || !engineKey) return null;
  const dl = getEngine(engineKey).dieline(parsed.data.dimensions);
  const config = cfg ?? (await getPricing());
  return (dl.width * dl.height * (1 + config.wastePercent / 100)) / 1e6;
}

/** Price-list lines for a design regardless of the automatic quantity limits (the quote builder starts from these). */
export async function priceListFor(doc: DesignDocument, engineKey: string, spec: { materialCode: string | null; finishingCodes: string[]; quantity: number }, cfg?: PricingConfig) {
  const config = cfg ?? (await getPricing());
  return priceListLines(config, quoteInputFromDesign(doc, engineKey, spec), { finishings: await finishingNames() });
}
