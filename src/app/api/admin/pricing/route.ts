import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { pricingConfigSchema } from "@/lib/pricing";
import { getPricing, PRICING_KEY } from "@/lib/pricing-store";

const CODE = /^[a-z0-9][a-z0-9-]{0,59}$/;

export const GET = api(async () => {
  await requirePermission("pricing.manage");
  return ok({ config: await getPricing() });
});

/** Save the factory price list. New prices apply to new requests only; offers already created keep their figures. */
export const PUT = api(async (req) => {
  const user = await requirePermission("pricing.manage");
  const cfg = await parseJson(req, pricingConfigSchema);
  const keys = [...Object.keys(cfg.materials), ...Object.keys(cfg.finishings), ...Object.keys(cfg.engines)];
  if (keys.some((k) => !CODE.test(k))) throw new HttpError(400, "invalid_code");
  if (cfg.minQuantity > cfg.maxAutoQuantity) throw new HttpError(400, "invalid_quantity_range");
  if (new Set(cfg.tiers.map((t) => t.minQty)).size !== cfg.tiers.length) throw new HttpError(400, "duplicate_tier");

  const before = await getPricing();
  await db.pricingRule.upsert({ where: { key: PRICING_KEY }, update: { config: cfg, isActive: cfg.enabled }, create: { key: PRICING_KEY, config: cfg, isActive: cfg.enabled } });
  // record which sections changed (values stay in the rule row)
  const changed = (Object.keys(cfg) as (keyof typeof cfg)[]).filter((k) => JSON.stringify(cfg[k]) !== JSON.stringify(before[k]));
  await audit({ actorId: user.id, action: "pricing.update", entity: "pricing_rule", entityId: PRICING_KEY, meta: { changed, enabled: cfg.enabled, mode: cfg.mode }, ip: clientIp(req) });
  return ok({ ok: true });
});
