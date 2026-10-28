import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { createSession, hashPassword, HttpError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { passwordProblem } from "@/lib/password-policy";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  password: z.string().min(8).max(200),
  locale: z.enum(["ar", "en"]).default("ar"),
});

export const POST = api(
  async (req) => {
    const body = await parseJson(req, schema);
    const weak = passwordProblem(body.password, { email: body.email });
    if (weak) throw new HttpError(422, weak);
    if (await db.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, "email_taken");
    const user = await db.$transaction(async (tx) => {
      const company = body.company ? await tx.company.create({ data: { name: body.company } }) : null;
      return tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone || null,
          locale: body.locale,
          passwordHash: await hashPassword(body.password),
          role: "CUSTOMER",
          profile: { create: { companyId: company?.id } },
        },
      });
    });
    await createSession(user.id, { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined });
    await audit({ actorId: user.id, action: "user.register", entity: "user", entityId: user.id, ip: clientIp(req) });
    return ok({ user: { id: user.id, name: user.name } }, 201);
  },
  { rate: { key: "register", limit: 10, windowMs: 60 * 60 * 1000 } },
);
