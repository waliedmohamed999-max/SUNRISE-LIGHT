import { z } from "zod";
import { api, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  locale: z.enum(["ar", "en"]),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  crNumber: z.string().trim().max(40).optional().or(z.literal("")),
  vatNumber: z.string().trim().max(40).optional().or(z.literal("")),
});

export const PATCH = api(async (req) => {
  const user = await requireUser();
  const b = await parseJson(req, schema);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name: b.name, phone: b.phone || null, locale: b.locale } });
    const profile = await tx.customerProfile.upsert({ where: { userId: user.id }, update: { city: b.city || null, address: b.address || null }, create: { userId: user.id, city: b.city || null, address: b.address || null } });
    if (b.companyName) {
      if (profile.companyId) await tx.company.update({ where: { id: profile.companyId }, data: { name: b.companyName, crNumber: b.crNumber || null, vatNumber: b.vatNumber || null } });
      else {
        const c = await tx.company.create({ data: { name: b.companyName, crNumber: b.crNumber || null, vatNumber: b.vatNumber || null } });
        await tx.customerProfile.update({ where: { id: profile.id }, data: { companyId: c.id } });
      }
    }
  });
  return ok({ ok: true });
});
