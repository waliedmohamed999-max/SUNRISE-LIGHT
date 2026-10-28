import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { materialSchema } from "../schema";

export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requirePermission("material.manage");
  const { finishingIds, ...data } = await parseJson(req, materialSchema);
  await db.$transaction(async (tx) => {
    await tx.materialType.update({ where: { id }, data });
    await tx.materialFinishing.deleteMany({ where: { materialId: id } });
    if (finishingIds.length) await tx.materialFinishing.createMany({ data: finishingIds.map((finishingId) => ({ materialId: id, finishingId })) });
    await audit({ actorId: user.id, action: "material.update", entity: "material_type", entityId: id, ip: clientIp(req) }, tx);
  });
  return ok({ ok: true });
});
