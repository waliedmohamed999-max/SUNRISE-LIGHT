import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9-]{2,60}$/),
  nameAr: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
});
const patchSchema = z.object({ id: z.string().max(40), isAvailable: z.boolean() });

export const POST = api(async (req) => {
  const user = await requirePermission("material.manage");
  const body = await parseJson(req, createSchema);
  const f = await db.finishingOption.create({ data: { ...body, sortOrder: await db.finishingOption.count() } });
  await audit({ actorId: user.id, action: "finishing.create", entity: "finishing_option", entityId: f.id, ip: clientIp(req) });
  return ok({ finishing: { id: f.id } }, 201);
});

export const PATCH = api(async (req) => {
  const user = await requirePermission("material.manage");
  const body = await parseJson(req, patchSchema);
  await db.finishingOption.update({ where: { id: body.id }, data: { isAvailable: body.isAvailable } });
  await audit({ actorId: user.id, action: "finishing.update", entity: "finishing_option", entityId: body.id, meta: { isAvailable: body.isAvailable }, ip: clientIp(req) });
  return ok({ ok: true });
});
