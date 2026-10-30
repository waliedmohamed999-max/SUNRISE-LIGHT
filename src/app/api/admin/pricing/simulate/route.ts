import { z } from "zod";
import { api, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requirePermission } from "@/lib/auth";
import { computeQuote, COATING_KEYS, ELEMENT_FINISH_KEYS, PRINT_KEYS, pricingConfigSchema } from "@/lib/pricing";
import { getEngine, hasErrors, validateDimensions } from "@/packaging/engine";

const schema = z.object({
  config: pricingConfigSchema,
  templateCode: z.string().min(1).max(60),
  dims: z.object({ length: z.number().finite().positive(), width: z.number().finite().positive(), height: z.number().finite().positive() }).optional(),
  materialCode: z.string().max(60).nullable(),
  printOption: z.enum(PRINT_KEYS),
  insidePrint: z.boolean().default(false),
  coating: z.enum(COATING_KEYS).nullable().default(null),
  elementFinishes: z.array(z.enum(ELEMENT_FINISH_KEYS)).max(5).default([]),
  finishingCodes: z.array(z.string().max(60)).max(20).default([]),
  quantity: z.number().int().min(1).max(10_000_000),
});

/** Try a (possibly unsaved) price list on a template before publishing it. Nothing is stored. */
export const POST = api(async (req) => {
  await requirePermission("pricing.manage");
  const b = await parseJson(req, schema);
  const tpl = await db.packagingTemplate.findUnique({ where: { code: b.templateCode }, include: { currentVersion: true } });
  if (!tpl?.currentVersion) throw new HttpError(404, "not_found");
  const v = tpl.currentVersion;
  const engine = getEngine(tpl.engineKey);
  const dims = b.dims ?? { length: v.defaultLengthMm, width: v.defaultWidthMm, height: v.defaultHeightMm };
  if (hasErrors(validateDimensions(engine, dims, v))) throw new HttpError(422, "invalid_dimensions");
  const dl = engine.dieline(dims);
  const finishingNames = Object.fromEntries((await db.finishingOption.findMany({ select: { code: true, nameAr: true, nameEn: true } })).map((f) => [f.code, { ar: f.nameAr, en: f.nameEn }]));
  const result = computeQuote(
    b.config,
    {
      engineKey: tpl.engineKey,
      sheetAreaMm2: dl.width * dl.height,
      materialCode: b.materialCode,
      printOption: b.printOption,
      insidePrint: b.insidePrint,
      coating: b.coating,
      elementFinishFaces: Object.fromEntries(b.elementFinishes.map((k) => [k, 1])),
      finishingCodes: b.finishingCodes,
      quantity: b.quantity,
    },
    { finishings: finishingNames },
  );
  return ok({ result, dims, sheetMm: { w: Math.round(dl.width), h: Math.round(dl.height) } });
});
