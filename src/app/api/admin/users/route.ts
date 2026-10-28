import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { hashPassword, HttpError, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const role = z.enum(["SUPER_ADMIN", "FACTORY_MANAGER", "SALES", "TECH_REVIEWER", "CUSTOMER"]);
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(200),
  role,
});
const patchSchema = z.object({ id: z.string().max(40), role: role.optional(), isActive: z.boolean().optional() });

export const POST = api(async (req) => {
  const actor = await requirePermission("user.manage");
  const b = await parseJson(req, createSchema);
  if (await db.user.findUnique({ where: { email: b.email } })) throw new HttpError(409, "email_taken");
  const u = await db.user.create({ data: { name: b.name, email: b.email, role: b.role, passwordHash: await hashPassword(b.password) } });
  await audit({ actorId: actor.id, action: "user.create", entity: "user", entityId: u.id, meta: { role: b.role }, ip: clientIp(req) });
  return ok({ user: { id: u.id } }, 201);
});

export const PATCH = api(async (req) => {
  const actor = await requirePermission("user.manage");
  const b = await parseJson(req, patchSchema);
  if (b.id === actor.id && (b.isActive === false || (b.role && b.role !== "SUPER_ADMIN"))) throw new HttpError(409, "cannot_demote_self");
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: b.id }, data: { role: b.role, isActive: b.isActive } });
    // Role or activation changes revoke existing sessions
    await tx.session.deleteMany({ where: { userId: b.id } });
    await audit({ actorId: actor.id, action: "user.update", entity: "user", entityId: b.id, meta: { role: b.role ?? null, isActive: b.isActive ?? null }, ip: clientIp(req) }, tx);
  });
  return ok({ ok: true });
});
