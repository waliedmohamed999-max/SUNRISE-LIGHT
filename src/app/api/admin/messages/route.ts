import { z } from "zod";
import { api, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";

export const PATCH = api(async (req) => {
  await requirePermission("customer.view");
  const b = await parseJson(req, z.object({ id: z.string().max(40), handled: z.boolean() }));
  await db.contactMessage.update({ where: { id: b.id }, data: { handled: b.handled } });
  return ok({ ok: true });
});
