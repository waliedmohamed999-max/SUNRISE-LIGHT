import { z } from "zod";
import { api, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loadDesignFor, validateDesignForOwner } from "@/lib/designs";
import { getPricing, priceDesign } from "@/lib/pricing-store";

const schema = z.object({
  designId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(10_000_000),
  materialCode: z.string().max(60).nullable(),
  finishingCodes: z.array(z.string().max(60)).max(20).default([]),
});

/**
 * Live price estimate for the customer's own design, from the factory price list.
 * Returns only the customer-facing figures — never cost lines, margin or the price list itself.
 */
export const POST = api(
  async (req) => {
    const user = await requireUser();
    const body = await parseJson(req, schema);
    // ownership first, so the answer never depends on someone else's design
    const design = await loadDesignFor(user, body.designId, "write");
    const pricing = await getPricing();
    if (!pricing.enabled || !pricing.showEstimate) return ok({ available: false });

    const { doc, template } = await validateDesignForOwner(design.document, user.id, { requireEnabled: true });
    // same compatibility rules as the request itself; anything else simply is not priced
    const material = body.materialCode
      ? await db.materialType.findFirst({ where: { code: body.materialCode, isAvailable: true, templateRules: { some: { templateId: template.id } } }, select: { code: true } })
      : null;
    const finishings = await db.finishingOption.findMany({ where: { code: { in: body.finishingCodes }, isAvailable: true }, select: { code: true } });

    const q = await priceDesign(doc, template.engineKey, { materialCode: material?.code ?? null, finishingCodes: finishings.map((f) => f.code), quantity: body.quantity }, pricing);
    if (!q.ok) return ok({ available: true, ok: false, reasons: q.reasons.map(({ ar, en }) => ({ ar, en })) });
    return ok({
      available: true,
      ok: true,
      mode: pricing.mode,
      currency: q.currency,
      quantity: q.quantity,
      unitPrice: q.unitPrice,
      subtotal: q.subtotal,
      taxPercent: q.taxPercent,
      tax: q.tax,
      total: q.total,
      discountPercent: q.discountPercent,
      nextTier: q.nextTier,
      validityDays: pricing.validityDays,
    });
  },
  { rate: { key: "estimate", limit: 240, windowMs: 60 * 60 * 1000 } },
);
