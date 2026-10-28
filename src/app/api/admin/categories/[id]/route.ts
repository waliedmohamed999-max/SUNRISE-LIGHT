import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const categorySchema = z.object({
  nameAr: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  descriptionAr: z.string().max(1000),
  descriptionEn: z.string().max(1000),
  status: z.enum(["ACTIVE", "COMING_SOON", "HIDDEN"]),
  sortOrder: z.number().int().min(0).max(10_000),
});

export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requirePermission("template.manage");
  const data = await parseJson(req, categorySchema);
  await db.packagingCategory.update({ where: { id }, data });
  await audit({ actorId: user.id, action: "category.update", entity: "packaging_category", entityId: id, meta: { status: data.status }, ip: clientIp(req) });
  return ok({ ok: true });
});
