import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { materialSchema } from "./schema";



export const POST = api(async (req) => {
  const user = await requirePermission("material.manage");
  const { finishingIds, ...data } = await parseJson(req, materialSchema);
  const m = await db.materialType.create({ data: { ...data, finishings: { create: finishingIds.map((finishingId) => ({ finishingId })) } } });
  await audit({ actorId: user.id, action: "material.create", entity: "material_type", entityId: m.id, ip: clientIp(req) });
  return ok({ material: { id: m.id } }, 201);
});
